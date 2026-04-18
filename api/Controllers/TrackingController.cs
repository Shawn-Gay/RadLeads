using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
public class TrackingController(AppDbContext db) : ControllerBase
{
    // 1×1 transparent GIF
    private static readonly byte[] TransparentGif =
        Convert.FromBase64String("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

    // GET /track/open?t={token}
    [HttpGet("/track/open")]
    public async Task<IActionResult> Open([FromQuery] Guid t)
    {
        var send = await db.CampaignSends
            .Include(o => o.Campaign)
            .FirstOrDefaultAsync(o => o.Token == t);

        if (send is not null && send.OpenedAt is null)
        {
            send.OpenedAt = DateTimeOffset.UtcNow;
            send.Campaign.Opens++;
            await db.SaveChangesAsync();
        }

        return File(TransparentGif, "image/gif");
    }

    // GET /track/click?t={token}&url={base64url}
    [HttpGet("/track/click")]
    public async Task<IActionResult> Click([FromQuery] Guid t, [FromQuery] string url)
    {
        var send = await db.CampaignSends
            .Include(o => o.Campaign)
            .FirstOrDefaultAsync(o => o.Token == t);

        if (send is not null && send.ClickedAt is null)
        {
            send.ClickedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }

        // Decode url-safe base64
        var padded = url.Replace('-', '+').Replace('_', '/');
        padded += (padded.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };

        string decoded;
        try { decoded = Encoding.UTF8.GetString(Convert.FromBase64String(padded)); }
        catch { return BadRequest(); }

        return Redirect(decoded);
    }

    // GET /track/email/open/{trackingId} — follow-up email open pixel
    [HttpGet("/track/email/open/{trackingId:guid}")]
    public async Task<IActionResult> EmailOpen(Guid trackingId)
    {
        var email = await db.OutboundEmails
            .FirstOrDefaultAsync(o => o.TrackingId == trackingId);

        if (email is not null)
        {
            db.EmailEvents.Add(new EmailEvent
            {
                OutboundEmailId = email.Id,
                EventType       = EmailEventType.Opened,
                OccurredAt      = DateTimeOffset.UtcNow,
                UserAgent       = Request.Headers.UserAgent.ToString(),
            });
            await db.SaveChangesAsync();
        }

        return File(TransparentGif, "image/gif");
    }

    // GET /track/email/click/{trackingId}?url={encoded} — follow-up email link click
    [HttpGet("/track/email/click/{trackingId:guid}")]
    public async Task<IActionResult> EmailClick(Guid trackingId, [FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest();

        var email = await db.OutboundEmails
            .FirstOrDefaultAsync(o => o.TrackingId == trackingId);

        if (email is not null)
        {
            db.EmailEvents.Add(new EmailEvent
            {
                OutboundEmailId = email.Id,
                EventType       = EmailEventType.Clicked,
                OccurredAt      = DateTimeOffset.UtcNow,
                ClickedUrl      = url,
                UserAgent       = Request.Headers.UserAgent.ToString(),
            });
            await db.SaveChangesAsync();
        }

        return Redirect(url);
    }
}
