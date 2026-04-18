using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/email-templates")]
public class EmailTemplatesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeArchived = false)
    {
        var q = db.EmailTemplates.Include(o => o.OutcomeAssignments).AsQueryable();
        if (!includeArchived) q = q.Where(o => !o.IsArchived);

        var list = await q.OrderBy(o => o.Name).ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id)
    {
        var t = await db.EmailTemplates.Include(o => o.OutcomeAssignments).FirstOrDefaultAsync(o => o.Id == id);
        if (t is null) return NotFound();
        return Ok(ToDto(t));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertEmailTemplateInput input)
    {
        var t = new EmailTemplate
        {
            Name    = input.Name.Trim(),
            Subject = input.Subject,
            Body    = input.Body,
        };
        db.EmailTemplates.Add(t);
        await db.SaveChangesAsync();
        return Ok(ToDto(t));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertEmailTemplateInput input)
    {
        var t = await db.EmailTemplates.Include(o => o.OutcomeAssignments).FirstOrDefaultAsync(o => o.Id == id);
        if (t is null) return NotFound();
        t.Name    = input.Name.Trim();
        t.Subject = input.Subject;
        t.Body    = input.Body;
        await db.SaveChangesAsync();
        return Ok(ToDto(t));
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, [FromQuery] bool archived = true)
    {
        var t = await db.EmailTemplates.Include(o => o.OutcomeAssignments).FirstOrDefaultAsync(o => o.Id == id);
        if (t is null) return NotFound();
        t.IsArchived = archived;
        await db.SaveChangesAsync();
        return Ok(ToDto(t));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var t = await db.EmailTemplates.FindAsync(id);
        if (t is null) return NotFound();
        db.EmailTemplates.Remove(t);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Assign (or re-assign) a template to an outcome. Idempotent on (template, outcome).
    // If isDefault: true, clears IsDefault on all other templates for the same outcome.
    [HttpPost("{id:guid}/outcomes")]
    public async Task<IActionResult> AssignOutcome(Guid id, [FromBody] EmailTemplateOutcomeInput input)
    {
        var t = await db.EmailTemplates.Include(o => o.OutcomeAssignments).FirstOrDefaultAsync(o => o.Id == id);
        if (t is null) return NotFound();

        var existing = t.OutcomeAssignments.FirstOrDefault(o => o.Outcome == input.Outcome);
        if (existing is null)
        {
            existing = new EmailTemplateOutcome { Outcome = input.Outcome, Template = t };
            t.OutcomeAssignments.Add(existing);
        }
        existing.IsDefault = input.IsDefault;

        if (input.IsDefault)
        {
            // Clear default on other templates for this outcome
            var others = await db.EmailTemplateOutcomes
                .Where(o => o.Outcome == input.Outcome
                         && EF.Property<Guid>(o, "EmailTemplateId") != id
                         && o.IsDefault)
                .ToListAsync();
            foreach (var o in others) o.IsDefault = false;
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(t));
    }

    [HttpDelete("{id:guid}/outcomes/{outcome}")]
    public async Task<IActionResult> UnassignOutcome(Guid id, CallOutcome outcome)
    {
        var t = await db.EmailTemplates.Include(o => o.OutcomeAssignments).FirstOrDefaultAsync(o => o.Id == id);
        if (t is null) return NotFound();

        var assignment = t.OutcomeAssignments.FirstOrDefault(o => o.Outcome == outcome);
        if (assignment is not null)
        {
            db.EmailTemplateOutcomes.Remove(assignment);
            await db.SaveChangesAsync();
        }
        return Ok(ToDto(t));
    }

    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> Stats(Guid id)
    {
        var exists = await db.EmailTemplates.AnyAsync(o => o.Id == id);
        if (!exists) return NotFound();

        var sends = await db.OutboundEmails
            .Where(o => EF.Property<Guid?>(o, "EmailTemplateId") == id)
            .Select(o => o.Status)
            .ToListAsync();

        var counts = sends.GroupBy(o => o.ToString()).ToDictionary(o => o.Key, o => o.Count());
        return Ok(new EmailTemplateStatsDto(id, sends.Count, counts));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    static EmailTemplateDto ToDto(EmailTemplate t) => new(
        t.Id,
        t.Name,
        t.Subject,
        t.Body,
        t.IsArchived,
        t.OutcomeAssignments.Select(o => new EmailTemplateOutcomeDto(o.Id, o.Outcome, o.IsDefault)).ToList(),
        t.CreatedAt,
        t.UpdatedAt);
}
