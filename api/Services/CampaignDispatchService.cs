using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;
using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public class CampaignDispatchService(IConfiguration config, ILogger<CampaignDispatchService> logger)
    : ICampaignDispatchService
{
    private static readonly Regex LinkPattern =
        new(@"href=""(https?://[^""]+)""", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public async Task ScheduleDayAsync(AppDbContext db, CancellationToken ct = default)
    {
        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);
        var today = todayStart.Date;
        var baseUrl = (config["TrackingBaseUrl"] ?? "https://localhost:5001").TrimEnd('/');

        var campaigns = await db.Campaigns
            .Include(o => o.Steps)
            .Include(o => o.Senders)
            .Include(o => o.People)
                .ThenInclude(o => o.Emails)
            .Include(o => o.People)
                .ThenInclude(o => o.Company)
            .Where(o => o.Status == CampaignStatus.Active)
            .ToListAsync(ct);

        // Derive how many emails are already queued or sent today per account
        var alreadyUsedToday = await db.OutboundEmails
            .Where(o => o.CreatedAt >= todayStart && o.Status != OutboundEmailStatus.Failed)
            .GroupBy(o => o.EmailAccountId)
            .Select(g => new { AccountId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(o => o.AccountId, o => o.Count, ct);

        foreach (var campaign in campaigns)
        {
            if (campaign.Steps.Count == 0 || campaign.Senders.Count == 0)
            {
                logger.LogDebug("Campaign {Name} has no steps or senders, skipping", campaign.Name);
                continue;
            }

            var steps = campaign.Steps.OrderBy(o => o.Day).ToList();

            // Load all prior sends for this campaign: (PersonId, StepId, enrollment anchor)
            var priorSends = await db.CampaignSends
                .Where(o => o.Campaign.Id == campaign.Id)
                .Select(o => new { PersonId = o.Person.Id, StepId = o.Step.Id, o.CreatedAt })
                .ToListAsync(ct);

            var sentStepsByPerson = priorSends
                .GroupBy(o => o.PersonId)
                .ToDictionary(g => g.Key, g => g.Select(o => o.StepId).ToHashSet());

            var enrolledAtByPerson = priorSends
                .GroupBy(o => o.PersonId)
                .ToDictionary(g => g.Key, g => g.Min(o => o.CreatedAt).Date);

            // Track remaining send capacity per sender — derived from actual OutboundEmail records
            var remaining = campaign.Senders.ToDictionary(
                o => o.Id,
                o => Math.Max(0, o.DailyLimit - alreadyUsedToday.GetValueOrDefault(o.Id, 0)));

            var senderIdx = 0;

            foreach (var person in campaign.People)
            {
                var primaryEmail = person.Emails
                    .FirstOrDefault(o => o.IsPrimary && o.Status != EmailStatus.Bounced);

                if (primaryEmail is null) continue;

                var sentSteps = sentStepsByPerson.GetValueOrDefault(person.Id, []);
                var enrolledAt = enrolledAtByPerson.GetValueOrDefault(person.Id, today);

                // First step due today that hasn't been sent yet
                var dueStep = steps.FirstOrDefault(o =>
                    !sentSteps.Contains(o.Id) &&
                    enrolledAt.AddDays(o.Day - 1) <= today);

                if (dueStep is null) continue;

                // Round-robin across senders; skip any at capacity
                EmailAccount? sender = null;
                for (var i = 0; i < campaign.Senders.Count; i++)
                {
                    var candidate = campaign.Senders[(senderIdx + i) % campaign.Senders.Count];
                    if (candidate.Status == AccountStatus.Active && remaining[candidate.Id] > 0)
                    {
                        sender = candidate;
                        senderIdx = (senderIdx + i + 1) % campaign.Senders.Count;
                        break;
                    }
                }

                if (sender is null)
                {
                    logger.LogDebug("All senders at daily limit for campaign {Name}, stopping", campaign.Name);
                    break;
                }

                remaining[sender.Id]--;
                alreadyUsedToday[sender.Id] = alreadyUsedToday.GetValueOrDefault(sender.Id, 0) + 1;

                var token = Guid.NewGuid();
                var subject = SubstituteTokens(dueStep.Subject, person);
                var body = SubstituteTokens(dueStep.Body, person);
                body = InjectTrackingPixel(body, token, baseUrl);
                body = RewriteLinks(body, token, baseUrl);

                var send = new CampaignSend
                {
                    Token = token,
                    Campaign = campaign,
                    Step = dueStep,
                    Person = person,
                    Account = sender,
                };

                db.CampaignSends.Add(send);
                db.OutboundEmails.Add(new OutboundEmail
                {
                    ToAddress = primaryEmail.Address,
                    Subject = subject,
                    Body = body,
                    EmailAccount = sender,
                    CampaignId = campaign.Id,
                    CampaignSend = send,
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    // ── Token substitution ────────────────────────────────────────────────────

    private static string SubstituteTokens(string template, LeadPerson person) =>
        template
            .Replace("{{firstName}}", person.FirstName)
            .Replace("{{lastName}}", person.LastName)
            .Replace("{{fullName}}", $"{person.FirstName} {person.LastName}")
            .Replace("{{company}}", person.Company?.Name ?? string.Empty)
            .Replace("{{title}}", person.Title ?? string.Empty)
            .Replace("{{city}}", person.City ?? string.Empty);

    // ── Tracking pixel ────────────────────────────────────────────────────────

    private static string InjectTrackingPixel(string html, Guid token, string baseUrl)
    {
        var pixel = $"""<img src="{baseUrl}/track/open?t={token}" width="1" height="1" style="display:none" alt="" />""";
        var closingBody = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return closingBody >= 0
            ? html.Insert(closingBody, pixel)
            : html + pixel;
    }

    // ── Link rewriting ────────────────────────────────────────────────────────

    private static string RewriteLinks(string html, Guid token, string baseUrl) =>
        LinkPattern.Replace(html, m =>
        {
            var original = m.Groups[1].Value;
            var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(original))
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');  // url-safe base64
            return $"href=\"{baseUrl}/track/click?t={token}&url={encoded}\"";
        });
}
