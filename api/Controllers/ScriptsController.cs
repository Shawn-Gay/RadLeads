using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/scripts")]
public class ScriptsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeArchived = false)
    {
        var q = db.Scripts.AsQueryable();
        if (!includeArchived) q = q.Where(o => !o.IsArchived);

        var scripts = await q.OrderBy(o => o.Name)
            .Select(o => new ScriptDto(o.Id, o.Name, o.Body, o.IsArchived, o.CreatedAt, o.UpdatedAt))
            .ToListAsync();
        return Ok(scripts);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id)
    {
        var s = await db.Scripts.FindAsync(id);
        if (s is null) return NotFound();
        return Ok(new ScriptDto(s.Id, s.Name, s.Body, s.IsArchived, s.CreatedAt, s.UpdatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertScriptInput input)
    {
        var s = new Script { Name = input.Name.Trim(), Body = input.Body };
        db.Scripts.Add(s);
        await db.SaveChangesAsync();
        return Ok(new ScriptDto(s.Id, s.Name, s.Body, s.IsArchived, s.CreatedAt, s.UpdatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertScriptInput input)
    {
        var s = await db.Scripts.FindAsync(id);
        if (s is null) return NotFound();
        s.Name = input.Name.Trim();
        s.Body = input.Body;
        await db.SaveChangesAsync();
        return Ok(new ScriptDto(s.Id, s.Name, s.Body, s.IsArchived, s.CreatedAt, s.UpdatedAt));
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, [FromQuery] bool archived = true)
    {
        var s = await db.Scripts.FindAsync(id);
        if (s is null) return NotFound();
        s.IsArchived = archived;
        await db.SaveChangesAsync();
        return Ok(new ScriptDto(s.Id, s.Name, s.Body, s.IsArchived, s.CreatedAt, s.UpdatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var s = await db.Scripts.FindAsync(id);
        if (s is null) return NotFound();
        db.Scripts.Remove(s);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> Stats(Guid id, [FromQuery] Guid? dialerId = null)
    {
        var exists = await db.Scripts.AnyAsync(o => o.Id == id);
        if (!exists) return NotFound();

        var callsQuery = db.CallLogs.Where(o => EF.Property<Guid?>(o, "ScriptId") == id);
        if (dialerId is not null)
            callsQuery = callsQuery.Where(o => EF.Property<Guid?>(o, "DialerId") == dialerId);

        var calls = await callsQuery
            .Select(o => new { o.Outcome, DialerId = EF.Property<Guid?>(o, "DialerId") })
            .ToListAsync();

        var outcomeCounts = calls
            .GroupBy(o => o.Outcome.ToString())
            .ToDictionary(o => o.Key, o => o.Count());

        var dialerNames = await db.Dialers.ToDictionaryAsync(o => o.Id, o => o.Name);

        var perDialer = calls
            .Where(o => o.DialerId is not null)
            .GroupBy(o => o.DialerId!.Value)
            .Select(o => new ScriptStatsPerDialer(
                o.Key,
                dialerNames.TryGetValue(o.Key, out var n) ? n : "(unknown)",
                o.Count(),
                o.GroupBy(x => x.Outcome.ToString()).ToDictionary(x => x.Key, x => x.Count())))
            .OrderByDescending(o => o.TotalCalls)
            .ToList();

        return Ok(new ScriptStatsDto(id, calls.Count, outcomeCounts, perDialer));
    }

    [HttpGet("{id:guid}/feedback")]
    public async Task<IActionResult> GetFeedback(Guid id)
    {
        var list = await db.ScriptFeedback
            .Where(o => EF.Property<Guid>(o, "ScriptId") == id)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new ScriptFeedbackDto(
                o.Id,
                EF.Property<Guid>(o, "ScriptId"),
                EF.Property<Guid?>(o, "CallLogId"),
                EF.Property<Guid?>(o, "DialerId"),
                o.Note,
                o.BodySnapshot,
                o.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("{id:guid}/feedback")]
    public async Task<IActionResult> PostFeedback(Guid id, [FromBody] ScriptFeedbackInput input)
    {
        var script = await db.Scripts.FindAsync(id);
        if (script is null) return NotFound();

        var fb = new ScriptFeedback
        {
            Script = script,
            Note = input.Note,
            BodySnapshot = input.BodySnapshot ?? script.Body,
        };

        if (input.CallLogId is not null)
        {
            var call = await db.CallLogs.FindAsync(input.CallLogId.Value);
            if (call is null) return NotFound("CallLog not found.");
            fb.CallLog = call;
        }

        if (input.DialerId is not null)
        {
            var dialer = await db.Dialers.FindAsync(input.DialerId.Value);
            if (dialer is null) return NotFound("Dialer not found.");
            fb.Dialer = dialer;
        }

        db.ScriptFeedback.Add(fb);
        await db.SaveChangesAsync();
        return Ok(new ScriptFeedbackDto(
            fb.Id, id, input.CallLogId, input.DialerId, fb.Note, fb.BodySnapshot, fb.CreatedAt));
    }
}
