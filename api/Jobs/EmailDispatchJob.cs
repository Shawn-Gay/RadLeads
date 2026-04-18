using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

[DisallowConcurrentExecution]
public partial class EmailDispatchJob(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<EmailDispatchJob> logger) : IJob
{
    [GeneratedRegex(@"href=""(https?://[^""]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex LinkPattern();

    public async Task Execute(IJobExecutionContext context)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailSendService>();
        var encryption = scope.ServiceProvider.GetRequiredService<EncryptionService>();

        var todayStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero);

        // Derive how many have already been sent today per account from the actual send records
        var sentToday = await db.OutboundEmails
            .Where(o => o.SentAt >= todayStart)
            .GroupBy(o => o.EmailAccountId)
            .Select(g => new { AccountId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(o => o.AccountId, o => o.Count, context.CancellationToken);

        var pending = await db.OutboundEmails
            .Include(o => o.EmailAccount)
            .Include(o => o.CampaignSend)
            .Where(o => o.Status == OutboundEmailStatus.Pending
                     && (o.ScheduledFor == null || o.ScheduledFor <= DateTimeOffset.UtcNow)
                     && o.EmailAccount.Status != AccountStatus.Paused)
            .OrderBy(o => o.CreatedAt)
            .Take(100)
            .ToListAsync(context.CancellationToken);

        foreach (var email in pending)
        {
            var account = email.EmailAccount;
            var alreadySent = sentToday.GetValueOrDefault(account.Id, 0);

            if (alreadySent >= account.DailyLimit)
            {
                logger.LogDebug("Account {Email} at daily limit ({Limit}), skipping", account.Email, account.DailyLimit);
                continue;
            }

            try
            {
                var baseUrl = configuration["TrackingBaseUrl"]?.TrimEnd('/') ?? string.Empty;
                InjectTracking(email, baseUrl);

                var password = encryption.Decrypt(account.EncryptedPassword);
                var messageId = await emailService.SendAsync(email, account, password);

                email.Status = OutboundEmailStatus.Sent;
                email.SentAt = DateTimeOffset.UtcNow;
                email.MessageId = messageId;
                sentToday[account.Id] = alreadySent + 1;

                if (email.CampaignSend is not null)
                {
                    email.CampaignSend.SentAt = email.SentAt;
                    email.CampaignSend.MessageId = messageId;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send email {Id} to {To}", email.Id, email.ToAddress);
                email.Status = OutboundEmailStatus.Failed;
                email.ErrorMessage = ex.Message;
                email.RetryCount++;
            }

            await db.SaveChangesAsync(context.CancellationToken);
        }
    }

    static void InjectTracking(OutboundEmail email, string baseUrl)
    {
        if (string.IsNullOrEmpty(baseUrl)) return;

        var tid = email.TrackingId;

        // Rewrite <a href="https://..."> links
        email.Body = LinkPattern().Replace(email.Body, m =>
        {
            var original = m.Groups[1].Value;
            var encoded  = Uri.EscapeDataString(original);
            return $@"href=""{baseUrl}/track/email/click/{tid}?url={encoded}""";
        });

        // Append 1x1 open-tracking pixel before </body> (or at end)
        var pixel = $@"<img src=""{baseUrl}/track/email/open/{tid}"" width=""1"" height=""1"" style=""display:none"" />";
        var closeBody = email.Body.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        email.Body = closeBody >= 0
            ? email.Body.Insert(closeBody, pixel)
            : email.Body + pixel;
    }
}
