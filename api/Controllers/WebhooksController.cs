using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Models;

namespace RadLeads.Api.Controllers;

[ApiController]
public class WebhooksController(AppDbContext db, ILogger<WebhooksController> logger) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    // POST /webhooks/brevo
    // Configure in Brevo dashboard → Transactional → Webhooks → select "Hard bounce" + "Invalid email"
    [HttpPost("/webhooks/brevo")]
    public async Task<IActionResult> Brevo()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();

        BrevoEvent[]? events;
        try
        {
            events = JsonSerializer.Deserialize<BrevoEvent[]>(body, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse Brevo webhook body");
            return BadRequest();
        }

        if (events is null || events.Length == 0) return Ok();

        foreach (var ev in events)
        {
            if (!IsBounce(ev.Event)) continue;
            if (string.IsNullOrWhiteSpace(ev.Email)) continue;

            var address = ev.Email.ToLowerInvariant();

            var affected = await db.LeadEmails
                .Where(o => o.Address.ToLower() == address && o.Status != EmailStatus.Bounced)
                .ToListAsync();

            foreach (var email in affected)
                email.Status = EmailStatus.Bounced;

            if (affected.Count > 0)
            {
                logger.LogInformation("Marked {Count} LeadEmail(s) Bounced for {Address} ({Event})",
                    affected.Count, address, ev.Event);
            }
        }

        await db.SaveChangesAsync();
        return Ok();
    }

    private static bool IsBounce(string? ev) =>
        ev is "hard_bounce" or "invalid_email";

    private record BrevoEvent(
        [property: JsonPropertyName("event")]   string? Event,
        [property: JsonPropertyName("email")]   string? Email,
        [property: JsonPropertyName("message-id")] string? MessageId
    );
}
