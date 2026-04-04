using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

public class ScrapeLeadsJob(
    AppDbContext db,
    IScrapingService scraper,
    ILogger<ScrapeLeadsJob> logger) : IJob
{
    private const int BatchSize = 20;

    public async Task Execute(IJobExecutionContext context)
    {
        var ct = context.CancellationToken;

        var companies = await db.Companies
            .Where(o => o.EnrichStatus == EnrichStatus.Researching)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (companies.Count == 0) return;

        logger.LogInformation("Scraping {Count} companies", companies.Count);

        foreach (var company in companies)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                var result = await scraper.CrawlAsync(company.Domain, ct);

                if (result.Pages.Count == 0)
                {
                    company.EnrichStatus = EnrichStatus.Failed;
                    SetResearch(db, company, r =>
                    {
                        r.ErrorMessage = "No pages could be crawled";
                    });
                }
                else
                {
                    company.EnrichStatus = EnrichStatus.Researched;
                    company.ResearchedAt = DateTimeOffset.UtcNow;
                    SetResearch(db, company, r =>
                    {
                        r.RawText = result.CombinedText;
                        r.MeetingLink = result.MeetingLink;
                        r.PagesCrawledJson = JsonSerializer.Serialize(
                            result.Pages.Select(p => new { p.Label, p.Url }));
                        r.ScrapedAt = DateTimeOffset.UtcNow;
                        r.ErrorMessage = null;
                    });

                    logger.LogDebug("Scraped {Domain}: {Pages} pages, meeting={Meeting}",
                        company.Domain, result.Pages.Count, result.MeetingLink is not null);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Scrape failed for {Domain}", company.Domain);
                company.EnrichStatus = EnrichStatus.Failed;
                SetResearch(db, company, r => r.ErrorMessage = ex.Message);
            }

            await db.SaveChangesAsync(ct);
        }
    }

    // Upsert the CompanyResearch row for a company
    private static void SetResearch(AppDbContext db, Company company, Action<CompanyResearch> configure)
    {
        var research = db.CompanyResearches
            .Local
            .FirstOrDefault(o => o.Company.Id == company.Id)
            ?? new CompanyResearch { Company = company };

        configure(research);

        if (research.Id == Guid.Empty)
            db.CompanyResearches.Add(research);
    }
}
