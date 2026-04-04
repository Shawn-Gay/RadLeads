using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

/// <summary>
/// Runs daily at 8:05 AM UTC (just after WarmupScheduleJob). For each active campaign,
/// determines which step each enrolled person is due for today and writes OutboundEmail
/// + CampaignSend records. EmailDispatchJob handles actual delivery.
/// </summary>
[DisallowConcurrentExecution]
public class CampaignScheduleJob(
    IServiceScopeFactory scopeFactory,
    ILogger<CampaignScheduleJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dispatch = scope.ServiceProvider.GetRequiredService<ICampaignDispatchService>();

        logger.LogInformation("Running campaign day schedule");

        try
        {
            await dispatch.ScheduleDayAsync(db, context.CancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Campaign schedule failed");
        }
    }
}
