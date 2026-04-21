using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DialersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var dialers = await db.Dialers
            .OrderBy(o => o.Name)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.IsDisabled,
                SelectedScriptId = EF.Property<Guid?>(o, "SelectedScriptId"),
            })
            .ToListAsync();
        return Ok(dialers);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDialerRequest req)
    {
        var dialer = new Dialer { Name = req.Name.Trim() };
        db.Dialers.Add(dialer);
        await db.SaveChangesAsync();
        return Ok(new { dialer.Id, dialer.Name, dialer.IsDisabled, SelectedScriptId = (Guid?)null });
    }

    [HttpPatch("{id:guid}/disabled")]
    public async Task<IActionResult> SetDisabled(Guid id, [FromBody] SetDialerDisabledRequest req)
    {
        var dialer = await db.Dialers.FindAsync(id);
        if (dialer is null) return NotFound("Dialer not found.");
        dialer.IsDisabled = req.IsDisabled;
        await db.SaveChangesAsync();
        var selectedScriptId = db.Entry(dialer).Property<Guid?>("SelectedScriptId").CurrentValue;
        return Ok(new { dialer.Id, dialer.Name, dialer.IsDisabled, SelectedScriptId = selectedScriptId });
    }

    [HttpPost("{id:guid}/selected-script")]
    public async Task<IActionResult> SetSelectedScript(Guid id, [FromBody] SetSelectedScriptRequest req)
    {
        var dialer = await db.Dialers.FindAsync(id);
        if (dialer is null) return NotFound("Dialer not found.");

        if (req.ScriptId is null)
        {
            dialer.SelectedScript = null;
        }
        else
        {
            var script = await db.Scripts.FindAsync(req.ScriptId.Value);
            if (script is null) return NotFound("Script not found.");
            dialer.SelectedScript = script;
        }

        await db.SaveChangesAsync();
        return Ok(new { dialer.Id, dialer.Name, dialer.IsDisabled, SelectedScriptId = req.ScriptId });
    }
}

public record CreateDialerRequest(string Name);
public record SetSelectedScriptRequest(Guid? ScriptId);
public record SetDialerDisabledRequest(bool IsDisabled);
