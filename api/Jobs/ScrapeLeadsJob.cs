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
    private const int MaxScrapeFailures = 3;

    public async Task Execute(IJobExecutionContext context)
    {
        var ct = context.CancellationToken;

        var companies = await db.Companies
            .Include(o => o.Research)
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
                    RecordScrapeFailure(db, company, "No pages could be crawled");
                }
                else
                {
                    company.EnrichStatus = EnrichStatus.Researched;
                    company.ResearchedAt = DateTimeOffset.UtcNow;
                    if (result.Phone is not null && company.Phone is null)
                        company.Phone = result.Phone;
                    if (result.Email is not null && company.Email is null)
                        company.Email = result.Email;
                    SetResearch(db, company, r =>
                    {
                        r.RawText = result.CombinedText;
                        r.MeetingLink = result.MeetingLink;
                        r.PagesCrawledJson = JsonSerializer.Serialize(
                            result.Pages.Select(p => new { p.Label, p.Url }));
                        r.ScrapedAt = DateTimeOffset.UtcNow;
                        r.ErrorMessage = null;
                        r.ScrapeFailCount = 0;
                    });

                    logger.LogDebug("Scraped {Domain}: {Pages} pages, meeting={Meeting}",
                        company.Domain, result.Pages.Count, result.MeetingLink is not null);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Scrape failed for {Domain}", company.Domain);
                RecordScrapeFailure(db, company, ex.Message);
            }

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to save scrape results for {Domain}", company.Domain);
            }

        }
    }

    private void RecordScrapeFailure(AppDbContext db, Company company, string error)
    {
        SetResearch(db, company, r =>
        {
            r.ScrapeFailCount++;
            r.ErrorMessage = error;
        });

        if ((company.Research?.ScrapeFailCount ?? 1) >= MaxScrapeFailures)
        {
            company.EnrichStatus = EnrichStatus.Unreachable;
            logger.LogWarning("Marking {Domain} as Unreachable after {Max} failed scrape attempts", company.Domain, MaxScrapeFailures);
        }
        else
        {
            // Reset to Researching so the job picks it up again on the next tick
            company.EnrichStatus = EnrichStatus.Researching;
        }
    }

    // Upsert the CompanyResearch row for a company
    private static void SetResearch(AppDbContext db, Company company, Action<CompanyResearch> configure)
    {
        var research = db.CompanyResearches
            .Local
            .FirstOrDefault(o => o.Company.Id == company.Id);

        if (research == null)
        {
            research = new CompanyResearch { Company = company };
            db.CompanyResearches.Add(research);
        }

        configure(research);
    }
}
