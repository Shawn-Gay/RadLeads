using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

/// <summary>
/// Runs every 60 minutes. Connects via IMAP to each warming/active account,
/// rescues warmup emails from spam, marks them read, stars them, and occasionally replies.
/// Running hourly means engagement happens naturally as emails arrive throughout the day.
/// </summary>
[DisallowConcurrentExecution]
public class WarmupEngageJob(IServiceScopeFactory scopeFactory, ILogger<WarmupEngageJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var warmup = scope.ServiceProvider.GetRequiredService<IWarmupService>();

        var accounts = await db.EmailAccounts
            .Where(o => o.Status == AccountStatus.Warming || o.Status == AccountStatus.Active)
            .ToListAsync(context.CancellationToken);

        try
        {
            await warmup.EngageAsync(accounts, db, context.CancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Warmup engage failed");
        }
    }
}
