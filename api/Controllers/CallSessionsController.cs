using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/call-sessions")]
public class CallSessionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? dialerId)
    {
        var q = db.CallSessions.Include(o => o.Dialer).AsQueryable();
        if (dialerId is not null)
            q = q.Where(o => o.Dialer != null && o.Dialer.Id == dialerId.Value);
        var sessions = await q.OrderByDescending(o => o.StartedAt).Take(200).ToListAsync();
        return Ok(sessions.Select(ToListDto));
    }

    [HttpPost]
    public async Task<IActionResult> Start([FromBody] StartSessionInput input)
    {
        var session = new CallSession { StartedAt = DateTimeOffset.UtcNow };
        if (input.DialerId is not null)
        {
            var dialer = await db.Dialers.FindAsync(input.DialerId.Value);
            if (dialer is null) return NotFound("Dialer not found.");
            session.Dialer = dialer;
        }
        db.CallSessions.Add(session);
        await db.SaveChangesAsync();
        return Ok(ToDto(session));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] PatchSessionInput input)
    {
        var session = await db.CallSessions.FindAsync(id);
        if (session is null) return NotFound();
        if (input.LeadsCalledCount   is not null) session.LeadsCalledCount   = input.LeadsCalledCount.Value;
        if (input.TotalPausedSeconds is not null) session.TotalPausedSeconds = input.TotalPausedSeconds.Value;
        if (input.End) session.EndedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(session));
    }

    static CallSessionDto ToDto(CallSession s) => new(
        s.Id,
        s.StartedAt,
        s.EndedAt,
        s.LeadsCalledCount,
        s.TotalPausedSeconds,
        s.Dialer?.Id);

    static CallSessionListDto ToListDto(CallSession s) => new(
        s.Id,
        s.StartedAt,
        s.EndedAt,
        s.LeadsCalledCount,
        s.TotalPausedSeconds,
        s.Dialer?.Id,
        s.Dialer?.Name);
}
