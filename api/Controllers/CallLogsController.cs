using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

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
                o.CalledAt))
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
                o.CalledAt))
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
                o.CalledAt))
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

        if (input.CompanyId is not null)
        {
            var company = await db.Companies.FindAsync(input.CompanyId.Value);
            if (company is null) return NotFound("Company not found.");
            log.Company = company;
        }

        db.CallLogs.Add(log);
        await db.SaveChangesAsync();
        return Ok(ToDto(log));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    // Use on tracked entities after SaveChanges (nav properties are set)
    static CallLogDto ToDto(CallLog o) => new(
        o.Id,
        o.Person != null ? o.Person.Id : null,
        o.Company != null ? o.Company.Id : null,
        o.CalledPhone,
        o.Outcome,
        o.Notes,
        o.CalledAt);
}
