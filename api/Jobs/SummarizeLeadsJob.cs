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
            var (first, last) = SplitName(extracted.Name);
            if (string.IsNullOrEmpty(first)) continue;

            var fullNameKey = $"{first} {last}".ToLowerInvariant().Trim();
            if (existingNames.Contains(fullNameKey)) continue;

            var person = new LeadPerson
            {
                FirstName = Capitalize(first),
                LastName  = Capitalize(last),
                Title     = extracted.Title,
                Company   = company,
                Emails    = GuessEmails(first, last, company.Domain),
            };

            db.LeadPersons.Add(person);
        }
    }

    private static (string first, string last) SplitName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', 2);
        var first = parts[0].ToLowerInvariant();
        var last  = parts.Length > 1
            ? parts[1].ToLowerInvariant().Replace(" ", "")
            : string.Empty;
        return (first, last);
    }

    private static string Capitalize(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToUpperInvariant(s[0]) + s[1..];

    private static List<LeadEmail> GuessEmails(string first, string last, string domain)
    {
        var addresses = string.IsNullOrEmpty(last)
            ? [$"{first}@{domain}"]
            : (string[])
            [
                $"{first}@{domain}",
                $"{first}.{last}@{domain}",
                $"{first[0]}{last}@{domain}",
                $"{first[0]}.{last}@{domain}",
            ];

        return addresses
            .Distinct()
            .Select((a, i) => new LeadEmail
            {
                Address   = a,
                Source    = EmailSource.Guessed,
                IsPrimary = i == 0,
                Status    = EmailStatus.Unknown,
            })
            .ToList();
    }
}
