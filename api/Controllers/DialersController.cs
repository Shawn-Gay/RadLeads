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
        var dialers = await db.Dialers.OrderBy(o => o.Name).ToListAsync();
        return Ok(dialers.Select(o => new { o.Id, o.Name }));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDialerRequest req)
    {
        var dialer = new Dialer { Name = req.Name.Trim() };
        db.Dialers.Add(dialer);
        await db.SaveChangesAsync();
        return Ok(new { dialer.Id, dialer.Name });
    }
}

public record CreateDialerRequest(string Name);
