using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CampaignsController(AppDbContext db, ICampaignDispatchService dispatch) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var campaigns = await db.Campaigns
            .Include(o => o.Steps)
            .Include(o => o.Senders)
            .Include(o => o.People)
            .ToListAsync();
        return Ok(campaigns.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var campaign = await db.Campaigns
            .Include(o => o.Steps)
            .Include(o => o.Senders)
            .Include(o => o.People)
            .FirstOrDefaultAsync(o => o.Id == id);
        return campaign is null ? NotFound() : Ok(ToDto(campaign));
    }

    [HttpPost]
    public async Task<IActionResult> Create(UpsertCampaignRequest req, CancellationToken ct)
    {
        var campaign = new Campaign { Name = req.Name };

        if (req.SenderIds.Count > 0)
        {
            var senders = await db.EmailAccounts
                .Where(o => req.SenderIds.Contains(o.Id))
                .ToListAsync(ct);
            campaign.Senders.AddRange(senders);
        }

        foreach (var s in req.Steps)
            campaign.Steps.Add(new CampaignStep
            {
                Id       = s.Id ?? Guid.NewGuid(),
                Day      = s.Day,
                Subject  = s.Subject,
                Body     = s.Body,
                Campaign = campaign,
            });

        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, ToDto(campaign));
    }

    // Full update: syncs name, senders, and steps.
    // Steps with an Id matching a DB step are updated; unrecognised Ids are inserted;
    // DB steps whose Id is absent from the request are removed.
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpsertCampaignRequest req, CancellationToken ct)
    {
        var campaign = await db.Campaigns
            .Include(o => o.Steps)
            .Include(o => o.Senders)
            .Include(o => o.People)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (campaign is null) return NotFound();

        campaign.Name = req.Name;

        // Sync senders
        var senders = await db.EmailAccounts
            .Where(o => req.SenderIds.Contains(o.Id))
            .ToListAsync(ct);
        campaign.Senders.Clear();
        campaign.Senders.AddRange(senders);

        // Remove steps not present in the request
        var requestIds = req.Steps
            .Where(o => o.Id.HasValue)
            .Select(o => o.Id!.Value)
            .ToHashSet();
        campaign.Steps.RemoveAll(o => !requestIds.Contains(o.Id));

        // Update existing / insert new
        foreach (var s in req.Steps)
        {
            var existing = s.Id.HasValue
                ? campaign.Steps.FirstOrDefault(o => o.Id == s.Id)
                : null;

            if (existing is not null)
            {
                existing.Day     = s.Day;
                existing.Subject = s.Subject;
                existing.Body    = s.Body;
            }
            else
            {
                campaign.Steps.Add(new CampaignStep
                {
                    Id       = s.Id ?? Guid.NewGuid(),
                    Day      = s.Day,
                    Subject  = s.Subject,
                    Body     = s.Body,
                    Campaign = campaign,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(campaign));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var campaign = await db.Campaigns.FindAsync(id);
        if (campaign is null) return NotFound();
        db.Campaigns.Remove(campaign);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> PatchStatus(Guid id, [FromBody] CampaignStatus status, CancellationToken ct)
    {
        var campaign = await db.Campaigns
            .Include(o => o.Steps)
            .Include(o => o.Senders)
            .Include(o => o.People)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (campaign is null) return NotFound();
        campaign.Status = status;
        await db.SaveChangesAsync(ct);
        return Ok(ToDto(campaign));
    }

    // Enroll multiple people in one request
    [HttpPost("{id:guid}/enroll")]
    public async Task<IActionResult> Enroll(Guid id, [FromBody] Guid[] personIds, CancellationToken ct)
    {
        var campaign = await db.Campaigns
            .Include(o => o.People)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (campaign is null) return NotFound();

        var people = await db.LeadPersons
            .Where(o => personIds.Contains(o.Id))
            .ToListAsync(ct);

        var enrolled = 0;
        foreach (var person in people)
        {
            if (campaign.People.All(o => o.Id != person.Id))
            {
                campaign.People.Add(person);
                enrolled++;
            }
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { enrolled });
    }

    [HttpDelete("{id:guid}/enroll/{personId:guid}")]
    public async Task<IActionResult> Unenroll(Guid id, Guid personId, CancellationToken ct)
    {
        var campaign = await db.Campaigns
            .Include(o => o.People)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (campaign is null) return NotFound();

        var person = campaign.People.FirstOrDefault(o => o.Id == personId);
        if (person is not null)
        {
            campaign.People.Remove(person);
            await db.SaveChangesAsync(ct);
        }

        return NoContent();
    }

    // Manually trigger one dispatch tick (for testing)
    [HttpPost("{id:guid}/send")]
    public async Task<IActionResult> Send(Guid id, CancellationToken ct)
    {
        var campaign = await db.Campaigns.FindAsync(new object[] { id }, ct);
        if (campaign is null) return NotFound();
        if (campaign.Status != CampaignStatus.Active)
            return BadRequest(new { error = "Campaign must be Active to dispatch." });
        await dispatch.ScheduleDayAsync(db, ct);
        return Ok();
    }

    // GET /api/campaigns/{id}/sends?limit=100
    [HttpGet("{id:guid}/sends")]
    public async Task<IActionResult> Sends(Guid id, [FromQuery] int limit = 100, CancellationToken ct = default)
    {
        var sends = await db.CampaignSends
            .Where(o => o.Campaign.Id == id)
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new CampaignSendDto(
                o.Id,
                o.Token,
                o.Person.FirstName + " " + o.Person.LastName,
                o.Person.Emails.Where(e => e.IsPrimary).Select(e => e.Address).FirstOrDefault() ?? string.Empty,
                o.Step.Day,
                o.Step.Subject,
                o.SentAt,
                o.OpenedAt,
                o.ClickedAt,
                o.RepliedAt,
                o.BouncedAt))
            .ToListAsync(ct);

        return Ok(sends);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    static CampaignDto ToDto(Campaign c) => new(
        c.Id,
        c.Name,
        c.Status,
        c.People.Count,
        c.Sent,
        c.Opens,
        c.Replies,
        c.Senders.Select(o => o.Id).ToList(),
        c.Steps.OrderBy(o => o.Day).Select(o => new CampaignStepDto(o.Id, o.Day, o.Subject, o.Body)).ToList()
    );
}
