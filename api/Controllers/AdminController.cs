using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLeads.Api.Data;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController(AppDbContext db) : ControllerBase
{
    public record PurgeRequest(
        bool Companies = true,
        bool Campaigns = true,
        bool CallLogs = true,
        bool Inbox = true,
        bool WarmupActivities = true,
        bool OutboundEmails = true,
        bool EmailAccounts = false
    );

    public record PurgeResult(Dictionary<string, int> Deleted);

    [HttpDelete("data")]
    public async Task<IActionResult> PurgeData([FromBody] PurgeRequest request)
    {
        var deleted = new Dictionary<string, int>();

        // Order matters: children before parents to respect FK constraints

        if (request.Companies)
        {
            deleted["leadEmails"] = await db.LeadEmails.ExecuteDeleteAsync();
            deleted["leadPersons"] = await db.LeadPersons.ExecuteDeleteAsync();
            deleted["companyGenericEmails"] = await db.CompanyGenericEmails.ExecuteDeleteAsync();
            deleted["companyResearches"] = await db.CompanyResearches.ExecuteDeleteAsync();
            deleted["companies"] = await db.Companies.ExecuteDeleteAsync();
        }

        if (request.Campaigns)
        {
            deleted["campaignSends"] = await db.CampaignSends.ExecuteDeleteAsync();
            deleted["campaignSteps"] = await db.CampaignSteps.ExecuteDeleteAsync();
            deleted["campaigns"] = await db.Campaigns.ExecuteDeleteAsync();
        }

        if (request.CallLogs)
            deleted["callLogs"] = await db.CallLogs.ExecuteDeleteAsync();

        if (request.Inbox)
            deleted["inboxReplies"] = await db.InboxReplies.ExecuteDeleteAsync();

        if (request.WarmupActivities)
            deleted["warmupActivities"] = await db.WarmupActivities.ExecuteDeleteAsync();

        if (request.OutboundEmails)
            deleted["outboundEmails"] = await db.OutboundEmails.ExecuteDeleteAsync();

        if (request.EmailAccounts)
            deleted["emailAccounts"] = await db.EmailAccounts.ExecuteDeleteAsync();

        return Ok(new PurgeResult(deleted));
    }
}
