using RadLeads.Api.Data;

namespace RadLeads.Api.Services;

public interface ICampaignDispatchService
{
    /// <summary>
    /// Runs once per day. For each active campaign, determines which step each enrolled
    /// person is due for today and writes OutboundEmail + CampaignSend records.
    /// Actual delivery is handled by EmailDispatchJob.
    /// </summary>
    Task ScheduleDayAsync(AppDbContext db, CancellationToken ct = default);
}
