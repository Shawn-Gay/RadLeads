using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/warmup")]
public class WarmupController(AppDbContext db, IWarmupService warmup) : ControllerBase
{
    // POST /api/warmup/run
    [HttpPost("run")]
    public async Task<IActionResult> Run(CancellationToken ct)
    {
        var accounts = await db.EmailAccounts
            .Where(o => o.Status == AccountStatus.Warming || o.Status == AccountStatus.Active)
            .ToListAsync(ct);

        await warmup.ScheduleDayAsync(accounts, db, ct);
        await warmup.EngageAsync(accounts, db, ct);

        return Ok(new { accounts = accounts.Count });
    }

    // GET /api/warmup/activities — all accounts, most recent first
    [HttpGet("activities")]
    public async Task<IActionResult> AllActivities([FromQuery] int limit = 200, CancellationToken ct = default)
    {
        var activities = await db.WarmupActivities
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new WarmupActivityDto(o.Id, o.Account.Id, o.PartnerEmail, o.Action, o.CreatedAt))
            .ToListAsync(ct);

        return Ok(activities);
    }

    // GET /api/warmup/activities/{accountId}?limit=50
    [HttpGet("activities/{accountId:guid}")]
    public async Task<IActionResult> Activities(Guid accountId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var activities = await db.WarmupActivities
            .Where(o => o.Account.Id == accountId)
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new WarmupActivityDto(o.Id, accountId, o.PartnerEmail, o.Action, o.CreatedAt))
            .ToListAsync(ct);

        return Ok(activities);
    }
}
