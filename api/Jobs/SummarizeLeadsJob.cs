using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

public class SummarizeLeadsJob(
    AppDbContext db,
    IAiService ai,
    ILogger<SummarizeLeadsJob> logger) : IJob
{
    private const int BatchSize = 10;   // keep AI calls manageable per tick

    public async Task Execute(IJobExecutionContext context)
    {
        var ct = context.CancellationToken;

        // Load companies queued for enrichment, with their scraped research
        var companies = await db.Companies
            .Include(o => o.Research)
            .Where(o => o.EnrichStatus == EnrichStatus.Enriching && o.Research != null)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (companies.Count == 0) return;

        logger.LogInformation("Summarizing {Count} companies via AI", companies.Count);

        foreach (var company in companies)
        {
            if (ct.IsCancellationRequested) break;

            var research = company.Research!;

            if (string.IsNullOrWhiteSpace(research.RawText))
            {
                company.EnrichStatus = EnrichStatus.Failed;
                research.ErrorMessage = "No scraped text available — run Research first";
                await db.SaveChangesAsync(ct);
                continue;
            }

            try
            {
                var summary = await ai.SummarizeCompanyAsync(company.Domain, research.RawText, ct);

                if (summary is null)
                {
                    company.EnrichStatus = EnrichStatus.Failed;
                    research.ErrorMessage = "AI returned no result";
                }
                else
                {
                    // Promote top-level fields onto Company for use in email templates
                    company.Summary    = summary.Summary;
                    company.RecentNews = summary.RecentNews;
                    company.EnrichStatus  = EnrichStatus.Enriched;
                    company.EnrichedAt    = DateTimeOffset.UtcNow;

                    research.SummaryJson    = JsonSerializer.Serialize(summary);
                    research.SummarizedAt   = DateTimeOffset.UtcNow;
                    research.ErrorMessage   = null;

                    logger.LogDebug("Enriched {Domain}: {People} people, {PainPoints} pain points",
                        company.Domain, summary.KeyPeople.Count, summary.PainPoints.Count);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Summarize failed for {Domain}", company.Domain);
                company.EnrichStatus = EnrichStatus.Failed;
                research.ErrorMessage = ex.Message;
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
