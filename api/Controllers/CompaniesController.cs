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
            .Include(o => o.People).ThenInclude(o => o.Emails)
            .Include(o => o.People).ThenInclude(o => o.Campaigns)
            .Include(o => o.GenericEmails)
            .ToListAsync();
        return Ok(companies.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var company = await db.Companies
            .Include(o => o.People).ThenInclude(o => o.Emails)
            .Include(o => o.People).ThenInclude(o => o.Campaigns)
            .Include(o => o.GenericEmails)
            .FirstOrDefaultAsync(o => o.Id == id);
        return company is null ? NotFound() : Ok(ToDto(company));
    }

    // Bulk import: groups by domain, upserts companies, deduplicates by email address.
    // Returns the affected CompanyDtos so the frontend can merge without a full reload.
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportPersonInput[] inputs)
    {
        var byDomain = inputs.GroupBy(o => o.Domain.ToLowerInvariant());
        var affected = new List<Company>();

        foreach (var group in byDomain)
        {
            var company = await db.Companies
                .Include(o => o.People).ThenInclude(o => o.Emails)
                .Include(o => o.People).ThenInclude(o => o.Campaigns)
                .Include(o => o.GenericEmails)
                .FirstOrDefaultAsync(o => o.Domain == group.Key);

            if (company is null)
            {
                company = new Company
                {
                    Domain = group.Key,
                    Name   = group.First().CompanyName ?? group.Key,
                };
                db.Companies.Add(company);
            }

            foreach (var input in group)
            {
                var emailLower   = input.Email.ToLowerInvariant();
                var emailExists  = company.People.Any(p =>
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
            }

            affected.Add(company);
        }

        await db.SaveChangesAsync();
        return Ok(affected.Select(ToDto));
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
            .Where(o => ids.Contains(o.Id) && o.EnrichStatus == EnrichStatus.NotEnriched)
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

    // ── helpers ──────────────────────────────────────────────────────────────

    static CompanyDto ToDto(Company c) => new(
        c.Id,
        c.Domain,
        c.Name,
        c.Employees,
        c.Summary,
        c.RecentNews,
        c.EnrichStatus,
        c.ResearchedAt,
        c.EnrichedAt,
        c.GenericEmails.Select(o => o.Email).ToList(),
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
            p.Emails.Select(e => new LeadEmailDto(e.Address, e.Source, e.IsPrimary, e.Status)).ToList(),
            p.Campaigns.Select(campaign => campaign.Id).ToList()
        )).ToList()
    );
}
