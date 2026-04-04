using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

/// <summary>
/// Runs at 8 AM UTC daily. Calculates today's send volume per account and writes
/// OutboundEmail records spread evenly across the day (8 AM – 8 PM).
/// EmailDispatchJob handles actual delivery. Also advances WarmupDay and health scores.
/// </summary>
[DisallowConcurrentExecution]
public class WarmupScheduleJob(IServiceScopeFactory scopeFactory, ILogger<WarmupScheduleJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var warmup = scope.ServiceProvider.GetRequiredService<IWarmupService>();

        var accounts = await db.EmailAccounts
            .Where(o => o.Status == AccountStatus.Warming || o.Status == AccountStatus.Active)
            .ToListAsync(context.CancellationToken);

        logger.LogInformation("Scheduling warmup sends for {Count} account(s)", accounts.Count);

        try
        {
            await warmup.ScheduleDayAsync(accounts, db, context.CancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Warmup schedule failed");
        }
    }
}
