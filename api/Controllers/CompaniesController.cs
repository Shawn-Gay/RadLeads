using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CompaniesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companies = await db.Companies
            .Include(o => o.AssignedTo)
            .Include(o => o.People).ThenInclude(o => o.Emails)
            .Include(o => o.People).ThenInclude(o => o.Campaigns)
            .Include(o => o.Research)
            .ToListAsync();
        return Ok(companies.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var company = await db.Companies
            .Include(o => o.AssignedTo)
            .Include(o => o.People).ThenInclude(o => o.Emails)
            .Include(o => o.People).ThenInclude(o => o.Campaigns)
            .Include(o => o.Research)
            .FirstOrDefaultAsync(o => o.Id == id);
        return company is null ? NotFound() : Ok(ToDto(company));
    }

    // Bulk import: groups by domain, upserts companies, deduplicates by email address.
    // Returns affected company IDs — frontend refreshes via getLeads().
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportPersonInput[] inputs)
    {
        var byDomain = inputs.GroupBy(o => o.Domain.ToLowerInvariant()).ToList();
        var domains  = byDomain.Select(o => o.Key).ToList();

        var existing = await db.Companies
            .Include(o => o.People).ThenInclude(o => o.Emails)
            .Include(o => o.People).ThenInclude(o => o.Campaigns)
            .Where(o => domains.Contains(o.Domain))
            .ToListAsync();

        var byDomainMap = existing.ToDictionary(o => o.Domain);
        var affectedIds = new List<Guid>();

        foreach (var group in byDomain)
        {
            if (!byDomainMap.TryGetValue(group.Key, out var company))
            {
                company = new Company
                {
                    Domain = group.Key,
                    Name   = group.First().CompanyName ?? group.Key,
                };
                db.Companies.Add(company);
                byDomainMap[group.Key] = company;
            }

            foreach (var input in group)
            {
                var emailLower  = input.Email.ToLowerInvariant();
                var emailExists = company.People.Any(p =>
                    p.Emails.Any(e => e.Address.ToLowerInvariant() == emailLower));
                if (emailExists) continue;

                var person = new LeadPerson
                {
                    FirstName   = input.FirstName,
                    LastName    = input.LastName,
                    Title       = input.Title ?? string.Empty,
                    Phone       = input.Phone,
                    City        = input.City,
                    LinkedinUrl = input.LinkedinUrl,
                    Company     = company,
                };
                var email = new LeadEmail
                {
                    Address   = input.Email,
                    Source    = EmailSource.Csv,
                    IsPrimary = true,
                    Status    = EmailStatus.Unknown,
                    Person    = person,
                };
                person.Emails.Add(email);
                company.People.Add(person);

                if (!string.IsNullOrWhiteSpace(input.CallStatus))
                {
                    var outcome = ParseCallOutcome(input.CallStatus);
                    if (outcome.HasValue)
                        db.CallLogs.Add(new CallLog
                        {
                            CalledPhone = input.Phone ?? string.Empty,
                            Outcome     = outcome.Value,
                            Person      = person,
                            Company     = company,
                        });
                }
            }

            affectedIds.Add(company.Id);
        }

        await db.SaveChangesAsync();
        return Ok(affectedIds);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Company company)
    {
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = company.Id }, ToDto(company));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, Company updated)
    {
        var company = await db.Companies.FindAsync(id);
        if (company is null) return NotFound();
        updated.Id = id;
        db.Entry(company).CurrentValues.SetValues(updated);
        await db.SaveChangesAsync();
        return Ok(ToDto(company));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var company = await db.Companies.FindAsync(id);
        if (company is null) return NotFound();
        db.Companies.Remove(company);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("queue-research")]
    public async Task<IActionResult> QueueResearch([FromBody] Guid[] ids)
    {
        var companies = await db.Companies
            .Where(o => ids.Contains(o.Id)
                     && (o.EnrichStatus == EnrichStatus.NotEnriched || o.EnrichStatus == EnrichStatus.ResearchFailed))
            .ToListAsync();
        foreach (var c in companies)
            c.EnrichStatus = EnrichStatus.Researching;
        await db.SaveChangesAsync();
        return Ok(new { queued = companies.Count });
    }

    [HttpPatch("queue-enrich")]
    public async Task<IActionResult> QueueEnrich([FromBody] Guid[] ids)
    {
        var companies = await db.Companies
            .Where(o => ids.Contains(o.Id) && o.EnrichStatus == EnrichStatus.Researched)
            .ToListAsync();
        foreach (var c in companies)
            c.EnrichStatus = EnrichStatus.Enriching;
        await db.SaveChangesAsync();
        return Ok(new { queued = companies.Count });
    }

    // Assign top-N unassigned companies (by priority) to a dialer.
    [HttpPost("assign")]
    public async Task<IActionResult> Assign([FromBody] AssignLeadsRequest req)
    {
        var dialer = await db.Dialers.FindAsync(req.DialerId);
        if (dialer is null) return NotFound("Dialer not found.");

        var existing = await db.Companies.CountAsync(o =>
            o.AssignedTo!.Id == req.DialerId && o.DialDisposition == DialDisposition.None);

        const int cap     = 50;
        var available = cap - existing;
        if (available <= 0) return BadRequest($"Already at cap ({cap} assigned leads).");

        var toAssign = Math.Min(req.Count, available);

        // Priority order: Enriched > Researched > other; then oldest first
        var companies = await db.Companies
            .Include(o => o.AssignedTo)
            .Include(o => o.People).ThenInclude(o => o.Emails)
            .Include(o => o.People).ThenInclude(o => o.Campaigns)
            .Include(o => o.Research)
            .Where(o => o.AssignedTo == null && o.DialDisposition == DialDisposition.None)
            .OrderByDescending(o => o.EnrichStatus == EnrichStatus.Enriched   ? 2 :
                                    o.EnrichStatus == EnrichStatus.Researched ? 1 : 0)
            .ThenBy(o => o.CreatedAt)
            .Take(toAssign)
            .ToListAsync();

        foreach (var c in companies)
        {
            c.AssignedTo = dialer;
            c.AssignedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(companies.Select(ToDto));
    }

    // Drop a company: unassign and optionally set a disposition.
    [HttpPatch("{id:guid}/drop")]
    public async Task<IActionResult> Drop(Guid id, [FromBody] DropLeadRequest req)
    {
        var company = await db.Companies
            .Include(o => o.AssignedTo)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (company is null) return NotFound();

        company.AssignedTo       = null;
        company.AssignedAt       = null;
        company.DialDisposition  = req.Disposition;

        await db.SaveChangesAsync();
        return Ok(new { company.Id, AssignedToId = (Guid?)null, company.DialDisposition });
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    // Bulk import: companies-only (no people). Upserts by domain.
    // Returns affected company IDs — frontend refreshes via getLeads().
    [HttpPost("import-companies")]
    public async Task<IActionResult> ImportCompanies([FromBody] ImportCompanyInput[] inputs)
    {
        var domains = inputs.Select(o => o.Domain.ToLowerInvariant()).Distinct().ToList();

        var existing = await db.Companies
            .Where(o => domains.Contains(o.Domain))
            .ToListAsync();

        var byDomain    = existing.ToDictionary(o => o.Domain);
        var affectedIds = new List<Guid>();

        foreach (var input in inputs)
        {
            var domain = input.Domain.ToLowerInvariant();

            if (!byDomain.TryGetValue(domain, out var company))
            {
                company = new Company
                {
                    Domain    = domain,
                    Name      = input.CompanyName ?? domain,
                    Phone     = input.Phone,
                    Email     = input.Email,
                    Employees = input.Employees,
                };
                db.Companies.Add(company);
                byDomain[domain] = company;
            }
            else
            {
                if (input.Phone is not null)       company.Phone     = input.Phone;
                if (input.Email is not null)       company.Email     = input.Email;
                if (input.Employees is not null)   company.Employees = input.Employees;
                if (input.CompanyName is not null) company.Name      = input.CompanyName;
            }

            if (!string.IsNullOrWhiteSpace(input.CallStatus))
            {
                var outcome = ParseCallOutcome(input.CallStatus);
                if (outcome.HasValue)
                    db.CallLogs.Add(new CallLog
                    {
                        CalledPhone = input.Phone ?? string.Empty,
                        Outcome     = outcome.Value,
                        Company     = company,
                    });
            }

            affectedIds.Add(company.Id);
        }

        await db.SaveChangesAsync();
        return Ok(affectedIds);
    }

    static CallOutcome? ParseCallOutcome(string raw) =>
        raw.ToLowerInvariant().Replace(" ", "").Replace("-", "").Replace("_", "") switch
        {
            "connected" or "answered" or "answer"      => CallOutcome.Connected,
            "leftvoicemail" or "voicemail" or "vm"     => CallOutcome.LeftVoicemail,
            "leftmessage" or "lm" or "messageleft" or "receptionistmessage" => CallOutcome.LeftMessage,
            "noanswer" or "na" or "noresponse"         => CallOutcome.NoAnswer,
            "wrongnumber" or "wn"                      => CallOutcome.WrongNumber,
            "callback" or "callbackrequested" or "cb"  => CallOutcome.CallBack,
            "notinterested" or "ni" or "dnc" or "donotcall" => CallOutcome.NotInterested,
            "interested"                               => CallOutcome.Interested,
            _ => (CallOutcome?)null,
        };

    static int CountPagesCrawled(Company c)
    {
        var json = c.Research?.PagesCrawledJson;
        if (string.IsNullOrEmpty(json)) return 0;
        try { return System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(json).GetArrayLength(); }
        catch { return 0; }
    }

    static CompanyDto ToDto(Company c) => new(
        c.Id,
        c.Domain,
        c.Name,
        c.Employees,
        c.Summary,
        c.RecentNews,
        c.Phone,
        c.Email,
        c.EnrichStatus,
        c.ResearchedAt,
        c.EnrichedAt,
        c.Research?.MeetingLink,
        CountPagesCrawled(c),
        c.AssignedTo?.Id,
        c.AssignedAt,
        c.DialDisposition,
        c.People.Select(p => new LeadPersonDto(
            p.Id,
            p.FirstName,
            p.LastName,
            p.Title,
            p.LinkedinUrl,
            p.Phone,
            p.City,
            p.Icebreaker,
            p.PainPoint,
            p.SourcePage,
            p.Emails.Select(e => new LeadEmailDto(e.Address, e.Source, e.IsPrimary, e.Status)).ToList(),
            p.Campaigns.Select(campaign => campaign.Id).ToList()
        )).ToList()
    );
}
