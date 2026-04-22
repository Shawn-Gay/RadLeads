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
            .Include(o => o.People)
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
                company.EnrichStatus = EnrichStatus.ResearchFailed;
                research.ErrorMessage = "No scraped text available — run Research first";
                await db.SaveChangesAsync(ct);
                continue;
            }

            try
            {
                var summary = await ai.SummarizeCompanyAsync(company.Domain, research.RawText, ct);

                if (summary is null)
                {
                    company.EnrichStatus = EnrichStatus.ResearchFailed;
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

                    SavePeopleWithGuessedEmails(db, company, summary.KeyPeople);

                    // Auto-queue web search when crawl + AI yielded no decision-maker person
                    var hasDecisionMaker =
                        company.People.Any(o => TitleHelper.IsDecisionMakerTitle(o.Title))
                        || summary.KeyPeople.Any(o => TitleHelper.IsDecisionMakerTitle(o.Title));
                    if (!hasDecisionMaker)
                    {
                        company.EnrichStatus = EnrichStatus.FindingDecisionMaker;
                    }

                    logger.LogInformation("Enriched {Domain}: {People} people extracted, {PainPoints} pain points",
                        company.Domain, summary.KeyPeople.Count, summary.PainPoints.Count);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Summarize failed for {Domain}", company.Domain);
                company.EnrichStatus = EnrichStatus.ResearchFailed;
                research.ErrorMessage = ex.Message;
            }

            await db.SaveChangesAsync(ct);
        }
    }

    private static void SavePeopleWithGuessedEmails(
        AppDbContext db, Company company, List<ExtractedPerson> keyPeople)
    {
        var existingNames = company.People
            .Select(o => $"{o.FirstName} {o.LastName}".ToLowerInvariant())
            .ToHashSet();

        foreach (var extracted in keyPeople)
        {
            var (first, last) = EmailPatternHelper.SplitName(extracted.Name);
            if (string.IsNullOrEmpty(first)) continue;

            var fullNameKey = $"{first} {last}".ToLowerInvariant().Trim();
            if (existingNames.Contains(fullNameKey)) continue;

            var person = new LeadPerson
            {
                FirstName  = EmailPatternHelper.Capitalize(first),
                LastName   = EmailPatternHelper.Capitalize(last),
                Title      = extracted.Title,
                SourcePage = extracted.SourcePage,
                Company    = company,
                Emails     = EmailPatternHelper.GuessEmails(first, last, company.Domain),
            };

            db.LeadPersons.Add(person);
        }
    }
}
