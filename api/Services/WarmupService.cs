using MailKit;
using MailKit.Net.Imap;
using MailKit.Net.Smtp;
using MailKit.Search;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using RadLeads.Api.Data;
using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public class WarmupService(EncryptionService encryption, IConfiguration config, ILogger<WarmupService> logger) : IWarmupService
{
    public const string SubjectPrefix = "[Warmup] ";

    private static readonly string[] SpamFolderNames = ["Spam", "Junk", "[Gmail]/Spam", "Bulk Mail"];

    // Active accounts send 5/day — enough to keep threads and signals alive
    // without eating into cold email quota
    private const int ActiveSustainedVolume = 5;

    private static readonly string[] Emojis = ["👍", "❤️", "🔥", "🙌", "😊", "✅", "💯", "👏", "🎉"];

    private static readonly string[] Subjects =
    [
        "Quick question",
        "Following up",
        "Checking in",
        "A thought",
        "Brief note",
        "Wanted to share",
        "Something you might like",
        "Just a heads up",
    ];

    private static readonly string[] Bodies =
    [
        "Hope this finds you well. Wanted to touch base and see how things are going on your end.",
        "Just a quick note — been thinking about our last conversation and had a few thoughts to share.",
        "Reaching out to follow up on a few things. Let me know if you have a moment to connect.",
        "Thought you might find this interesting. Would love to hear your take when you get a chance.",
        "Hope your week is going well. I had a quick question and figured I'd reach out directly.",
    ];

    // ── Schedule phase (8 AM daily) ───────────────────────────────────────────

    public async Task ScheduleDayAsync(List<EmailAccount> accounts, AppDbContext db, CancellationToken ct = default)
    {
        accounts = accounts
            .Where(o => o.Status == AccountStatus.Warming || o.Status == AccountStatus.Active)
            .ToList();

        if (accounts.Count < 2)
        {
            logger.LogWarning("Warmup network needs at least 2 accounts, skipping");
            return;
        }

        // Spread sends evenly between 8 AM and 8 PM UTC today
        var windowStart = new DateTimeOffset(DateTimeOffset.UtcNow.Date, TimeSpan.Zero).AddHours(8);
        var windowSeconds = TimeSpan.FromHours(12).TotalSeconds;

        foreach (var account in accounts)
        {
            var volume = account.Status == AccountStatus.Warming
                ? DailyVolume(account.WarmupDay ?? 0)
                : ActiveSustainedVolume;
            var partners = PickPartners(accounts, account, volume);

            for (var i = 0; i < partners.Count; i++)
            {
                var delay = partners.Count > 1
                    ? TimeSpan.FromSeconds(i * windowSeconds / (partners.Count - 1))
                    : TimeSpan.Zero;

                db.OutboundEmails.Add(new OutboundEmail
                {
                    EmailAccount = account,
                    ToAddress = partners[i].Email,
                    Subject = SubjectPrefix + Subjects[Random.Shared.Next(Subjects.Length)],
                    Body = Bodies[Random.Shared.Next(Bodies.Length)],
                    ScheduledFor = windowStart + delay,
                });

                // Log the intended send now — health calculation uses this count
                db.WarmupActivities.Add(new WarmupActivity
                {
                    Account = account,
                    PartnerEmail = partners[i].Email,
                    Action = WarmupAction.Sent,
                });
            }

            if (account.Status == AccountStatus.Warming)
            {
                account.WarmupDay = (account.WarmupDay ?? 0) + 1;
                if (account.WarmupDay >= account.WarmupTotalDays)
                    account.Status = AccountStatus.Active;
            }
        }

        await db.SaveChangesAsync(ct);

        // Recalculate health after save (needs today's Sent activities in DB)
        await UpdateHealthAsync(accounts, db, ct);
    }

    // ── Engage phase (every 60 min) ───────────────────────────────────────────

    public async Task EngageAsync(List<EmailAccount> accounts, AppDbContext db, CancellationToken ct = default)
    {
        accounts = accounts
            .Where(o => o.Status == AccountStatus.Warming || o.Status == AccountStatus.Active)
            .ToList();

        if (accounts.Count < 2) return;

        var batchEmails = accounts.Select(o => o.Email).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var account in accounts)
        {
            var password = encryption.Decrypt(account.EncryptedPassword);
            try
            {
                await ProcessImapAsync(account, password, batchEmails, db, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "IMAP engage failed for {Email}", account.Email);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task ProcessImapAsync(
        EmailAccount account, string password,
        HashSet<string> batchEmails, AppDbContext db, CancellationToken ct)
    {
        using var imap = new ImapClient();
        await imap.ConnectAsync(account.ImapHost, account.ImapPort, SecureSocketOptions.SslOnConnect, ct);
        await imap.AuthenticateAsync(account.Email, password, ct);

        // ── Spam: rescue warmup emails ────────────────────────────────────────
        var spamFolder = await FindSpamFolderAsync(imap);
        if (spamFolder != null)
        {
            await spamFolder.OpenAsync(FolderAccess.ReadWrite, ct);
            var spamSummaries = await FetchWarmupSummariesAsync(spamFolder, batchEmails, ct);

            if (spamSummaries.Count > 0)
            {
                var uids = spamSummaries.Select(o => o.UniqueId).ToList();
                await spamFolder.MoveToAsync(uids, imap.Inbox, ct);

                foreach (var summary in spamSummaries)
                {
                    db.WarmupActivities.Add(new WarmupActivity
                    {
                        Account = account,
                        PartnerEmail = summary.Envelope.From.Mailboxes.FirstOrDefault()?.Address ?? string.Empty,
                        Action = WarmupAction.MarkedNotSpam,
                    });
                }
            }

            await spamFolder.CloseAsync(false, ct);
        }

        // ── Inbox: read, star, reply ──────────────────────────────────────────
        await imap.Inbox.OpenAsync(FolderAccess.ReadWrite, ct);
        var inboxSummaries = await FetchWarmupSummariesAsync(imap.Inbox, batchEmails, ct);

        foreach (var summary in inboxSummaries)
        {
            var partnerEmail = summary.Envelope.From.Mailboxes.FirstOrDefault()?.Address ?? string.Empty;
            var uid = summary.UniqueId;
            var flags = summary.Flags ?? MessageFlags.None;

            if (!flags.HasFlag(MessageFlags.Seen))
            {
                await imap.Inbox.AddFlagsAsync(uid, MessageFlags.Seen, true, ct);
                db.WarmupActivities.Add(new WarmupActivity
                {
                    Account = account,
                    PartnerEmail = partnerEmail,
                    Action = WarmupAction.MarkedRead,
                });
            }

            if (!flags.HasFlag(MessageFlags.Flagged) && Random.Shared.NextDouble() < 0.15)
            {
                await imap.Inbox.AddFlagsAsync(uid, MessageFlags.Flagged, true, ct);
                db.WarmupActivities.Add(new WarmupActivity
                {
                    Account = account,
                    PartnerEmail = partnerEmail,
                    Action = WarmupAction.Starred,
                });
            }

            // \Answered flag prevents re-responding on subsequent hourly runs
            if (!flags.HasFlag(MessageFlags.Answered))
            {
                var roll = Random.Shared.NextDouble();
                // 38% text reply, 7% emoji reaction, 55% no response
                var action = roll < 0.38 ? WarmupAction.Replied
                           : roll < 0.45 ? WarmupAction.Reacted
                           : (WarmupAction?)null;

                if (action.HasValue)
                {
                    try
                    {
                        var original = await imap.Inbox.GetMessageAsync(uid, ct);
                        var body = action == WarmupAction.Reacted
                            ? Emojis[Random.Shared.Next(Emojis.Length)]
                            : null;
                        await SendReplyAsync(account, original, partnerEmail, password, body, ct);
                        await imap.Inbox.AddFlagsAsync(uid, MessageFlags.Answered, true, ct);
                        db.WarmupActivities.Add(new WarmupActivity
                        {
                            Account = account,
                            PartnerEmail = partnerEmail,
                            Action = action.Value,
                        });
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Warmup response failed: {From} to {To}", account.Email, partnerEmail);
                    }
                }
            }
        }

        await imap.Inbox.CloseAsync(false, ct);
        await imap.DisconnectAsync(true, ct);
    }

    private static readonly string[] ReplyBodies =
    [
        "Thanks for reaching out — will follow up shortly.",
        "Appreciate the note, talk soon.",
        "Got it, thanks!",
        "Thanks for this.",
        "Noted — will get back to you.",
    ];

    private async Task SendReplyAsync(
        EmailAccount from, MimeMessage original, string toAddress, string password,
        string? bodyOverride, CancellationToken ct)
    {
        var reply = new MimeMessage();
        reply.From.Add(new MailboxAddress(from.Email, from.Email));
        reply.To.Add(MailboxAddress.Parse(toAddress));
        var origSubject = original.Subject ?? string.Empty;
        reply.Subject = origSubject.StartsWith("Re: ", StringComparison.OrdinalIgnoreCase)
            ? origSubject
            : "Re: " + origSubject;
        if (original.MessageId != null)
        {
            reply.InReplyTo = original.MessageId;
            reply.References.AddRange(original.References);
            reply.References.Add(original.MessageId);
        }
        var text = bodyOverride ?? ReplyBodies[Random.Shared.Next(ReplyBodies.Length)];
        reply.Body = new TextPart("plain") { Text = text };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(
            config["Brevo:SmtpHost"] ?? "smtp-relay.brevo.com",
            config.GetValue<int>("Brevo:SmtpPort", 465),
            SecureSocketOptions.SslOnConnect, ct);
        await smtp.AuthenticateAsync(config["Brevo:Login"], config["Brevo:ApiKey"], ct);
        await smtp.SendAsync(reply, ct);
        await smtp.DisconnectAsync(true, ct);
    }

    // ── Health ────────────────────────────────────────────────────────────────

    private static async Task UpdateHealthAsync(List<EmailAccount> accounts, AppDbContext db, CancellationToken ct)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-14);

        foreach (var account in accounts)
        {
            var sentCount = await db.WarmupActivities
                .CountAsync(o => o.Account.Id == account.Id
                              && o.Action == WarmupAction.Sent
                              && o.CreatedAt >= since, ct);

            var spamCount = await db.WarmupActivities
                .CountAsync(o => o.PartnerEmail == account.Email
                              && o.Action == WarmupAction.MarkedNotSpam
                              && o.CreatedAt >= since, ct);

            account.Health = sentCount > 0
                ? (int)Math.Round(100.0 * (sentCount - spamCount) / sentCount)
                : null;
        }

        await db.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Volume ramp: day 0 = 2, day 28+ = 30
    private static int DailyVolume(int warmupDay) => Math.Min(warmupDay + 2, 30);

    private static List<EmailAccount> PickPartners(List<EmailAccount> accounts, EmailAccount self, int count)
    {
        var others = accounts.Where(o => o.Id != self.Id).ToList();
        var offset = (self.WarmupDay ?? 0) % others.Count;
        return others.Skip(offset).Concat(others.Take(offset)).Take(count).ToList();
    }

    private static async Task<IMailFolder?> FindSpamFolderAsync(ImapClient imap)
    {
        try
        {
            var personal = imap.GetFolder(imap.PersonalNamespaces[0]);
            var folders = await personal.GetSubfoldersAsync(false);
            return folders.FirstOrDefault(o =>
                SpamFolderNames.Contains(o.Name, StringComparer.OrdinalIgnoreCase));
        }
        catch
        {
            return null;
        }
    }

    private static async Task<List<IMessageSummary>> FetchWarmupSummariesAsync(
        IMailFolder folder, HashSet<string> batchEmails, CancellationToken ct)
    {
        var uids = await folder.SearchAsync(SearchQuery.SubjectContains(SubjectPrefix), ct);
        if (uids.Count == 0) return [];

        var summaries = await folder.FetchAsync(
            uids,
            MessageSummaryItems.UniqueId | MessageSummaryItems.Envelope | MessageSummaryItems.Flags,
            ct);

        return summaries
            .Where(o => o.Envelope?.From.Mailboxes.Any(m => batchEmails.Contains(m.Address)) == true)
            .ToList();
    }
}
