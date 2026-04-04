using RadLeads.Api.Data;
using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

public interface IWarmupService
{
    /// <summary>
    /// Runs once per day (8 AM). Writes staggered OutboundEmail records for the
    /// day's warmup sends, advances WarmupDay, and recalculates health scores.
    /// Actual delivery is handled by EmailDispatchJob.
    /// </summary>
    Task ScheduleDayAsync(List<EmailAccount> accounts, AppDbContext db, CancellationToken ct = default);

    /// <summary>
    /// Runs every hour. Connects via IMAP to each account, rescues warmup emails
    /// from spam, marks them read, stars them, and occasionally replies.
    /// Running hourly means engagement happens naturally as emails arrive throughout the day.
    /// </summary>
    Task EngageAsync(List<EmailAccount> accounts, AppDbContext db, CancellationToken ct = default);
}
