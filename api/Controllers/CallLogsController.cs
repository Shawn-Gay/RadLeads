using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/call-logs")]
public class CallLogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var logs = await db.CallLogs
            .OrderByDescending(o => o.CalledAt)
            .Select(o => new CallLogDto(
                o.Id,
                EF.Property<Guid?>(o, "PersonId"),
                EF.Property<Guid?>(o, "CompanyId"),
                o.CalledPhone,
                o.Outcome,
                o.Notes,
                o.CalledAt,
                EF.Property<Guid?>(o, "ScriptId"),
                EF.Property<Guid?>(o, "DialerId"),
                EF.Property<Guid?>(o, "CallSessionId")))
            .ToListAsync();
        return Ok(logs);
    }

    [HttpGet("person/{personId:guid}")]
    public async Task<IActionResult> GetByPerson(Guid personId)
    {
        var logs = await db.CallLogs
            .Where(o => EF.Property<Guid?>(o, "PersonId") == personId)
            .OrderByDescending(o => o.CalledAt)
            .Select(o => new CallLogDto(
                o.Id,
                EF.Property<Guid?>(o, "PersonId"),
                EF.Property<Guid?>(o, "CompanyId"),
                o.CalledPhone,
                o.Outcome,
                o.Notes,
                o.CalledAt,
                EF.Property<Guid?>(o, "ScriptId"),
                EF.Property<Guid?>(o, "DialerId"),
                EF.Property<Guid?>(o, "CallSessionId")))
            .ToListAsync();
        return Ok(logs);
    }

    [HttpGet("company/{companyId:guid}")]
    public async Task<IActionResult> GetByCompany(Guid companyId)
    {
        var logs = await db.CallLogs
            .Where(o => EF.Property<Guid?>(o, "CompanyId") == companyId)
            .OrderByDescending(o => o.CalledAt)
            .Select(o => new CallLogDto(
                o.Id,
                EF.Property<Guid?>(o, "PersonId"),
                EF.Property<Guid?>(o, "CompanyId"),
                o.CalledPhone,
                o.Outcome,
                o.Notes,
                o.CalledAt,
                EF.Property<Guid?>(o, "ScriptId"),
                EF.Property<Guid?>(o, "DialerId"),
                EF.Property<Guid?>(o, "CallSessionId")))
            .ToListAsync();
        return Ok(logs);
    }

    [HttpPost]
    public async Task<IActionResult> Log([FromBody] LogCallInput input)
    {
        if (input.PersonId is null && input.CompanyId is null)
            return BadRequest("Either PersonId or CompanyId is required.");

        var log = new CallLog
        {
            CalledPhone = input.CalledPhone,
            Outcome     = input.Outcome,
            Notes       = input.Notes,
            CalledAt    = DateTimeOffset.UtcNow,
        };

        if (input.PersonId is not null)
        {
            var person = await db.LeadPersons.FindAsync(input.PersonId.Value);
            if (person is null) return NotFound("Person not found.");
            log.Person = person;
        }

        Company? targetCompany = null;
        if (input.CompanyId is not null)
        {
            targetCompany = await db.Companies.FindAsync(input.CompanyId.Value);
            if (targetCompany is null) return NotFound("Company not found.");
            log.Company = targetCompany;
        }
        else if (input.PersonId is not null)
        {
            // Person-only calls still advance the owning company's cadence
            targetCompany = await db.Companies
                .FirstOrDefaultAsync(o => o.People.Any(p => p.Id == input.PersonId.Value));
        }

        if (input.ScriptId is not null)
        {
            var script = await db.Scripts.FindAsync(input.ScriptId.Value);
            if (script is null) return NotFound("Script not found.");
            log.Script = script;
        }

        if (input.DialerId is not null)
        {
            var dialer = await db.Dialers.FindAsync(input.DialerId.Value);
            if (dialer is null) return NotFound("Dialer not found.");
            log.Dialer = dialer;
        }

        if (input.CallSessionId is not null)
        {
            var session = await db.CallSessions.FindAsync(input.CallSessionId.Value);
            if (session is not null)
            {
                log.CallSession = session;
                session.LeadsCalledCount++;
            }
        }

        db.CallLogs.Add(log);

        if (targetCompany is not null)
            CadenceService.Advance(targetCompany, input.Outcome, input.CallbackAt, DateTimeOffset.UtcNow);

        await db.SaveChangesAsync();
        return Ok(ToDto(log));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    static CallLogDto ToDto(CallLog o) => new(
        o.Id,
        o.Person?.Id,
        o.Company?.Id,
        o.CalledPhone,
        o.Outcome,
        o.Notes,
        o.CalledAt,
        o.Script?.Id,
        o.Dialer?.Id,
        o.CallSession?.Id);
}
