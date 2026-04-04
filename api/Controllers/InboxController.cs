using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Dtos;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InboxController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var replies = await db.InboxReplies
            .Include(o => o.Send).ThenInclude(o => o.Person).ThenInclude(o => o.Company)
            .Include(o => o.Send).ThenInclude(o => o.Person).ThenInclude(o => o.Emails)
            .Include(o => o.Send).ThenInclude(o => o.Step)
            .Include(o => o.Send).ThenInclude(o => o.Account)
            .OrderByDescending(o => o.ReceivedAt)
            .ToListAsync(ct);

        return Ok(replies.Select(ToDto));
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var reply = await db.InboxReplies.FindAsync([id], ct);
        if (reply is null) return NotFound();
        reply.Read = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // Called by the IMAP poller (or manually) to store a received reply.
    [HttpPost("ingest")]
    public async Task<IActionResult> Ingest(IngestReplyRequest req, CancellationToken ct)
    {
        var send = await db.CampaignSends.FindAsync([req.SendId], ct);
        if (send is null) return NotFound(new { error = "CampaignSend not found." });

        var reply = new InboxReply
        {
            FromAddress = req.FromAddress,
            Body        = req.Body,
            ReceivedAt  = req.ReceivedAt,
            Send        = send,
        };

        // Mark the parent send as replied
        send.RepliedAt ??= req.ReceivedAt;

        db.InboxReplies.Add(reply);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetAll), new { }, new { reply.Id });
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    static InboxMessageDto ToDto(InboxReply r)
    {
        var send   = r.Send;
        var person = send.Person;
        var step   = send.Step;

        var sentBody = step.Body;
        var senderAddress = send.Account.Email;

        var thread = new List<ThreadMessageDto>
        {
            new(senderAddress, sentBody, send.SentAt?.ToString("MMM d, h:mm tt") ?? string.Empty),
            new(r.FromAddress, r.Body, r.ReceivedAt.ToString("MMM d, h:mm tt")),
        };

        var preview = r.Body.Length > 100 ? r.Body[..100] + "…" : r.Body;

        return new InboxMessageDto(
            r.Id,
            r.FromAddress,
            $"{person.FirstName} {person.LastName}",
            person.Company?.Name ?? string.Empty,
            step.Subject,
            preview,
            r.ReceivedAt.ToString("MMM d"),
            r.Read,
            thread);
    }
}
