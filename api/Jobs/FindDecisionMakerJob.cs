using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Quartz;
using RadLeads.Api.Data;
using RadLeads.Api.Models;
using RadLeads.Api.Services;

namespace RadLeads.Api.Jobs;

[DisallowConcurrentExecution]
public partial class FindDecisionMakerJob(
    AppDbContext db,
    ISerperSearchService serper,
    IAiService ai,
    ILogger<FindDecisionMakerJob> logger) : IJob
{
    private const int BatchSize = 5;
    private const int MaxFailures = 3;
    private const double HighConfidence = 0.7;

    [GeneratedRegex(@"^([\p{L}.\s'-]+?)\s+[-–]\s+(.+?)\s+[-–]\s+.+?(?:\||-)?\s*LinkedIn\s*$",
        RegexOptions.IgnoreCase)]
    private static partial Regex LinkedInTitleRegex();

    [GeneratedRegex(@"response from\s+([\p{L}.\s'-]+?)(?:,\s*|\s+[-–]\s+)(.+?)(?:\.|:|$)",
        RegexOptions.IgnoreCase)]
    private static partial Regex OwnerResponseRegex();

    public async Task Execute(IJobExecutionContext context)
    {
        // Job disabled for now...
        //return;

        var ct = context.CancellationToken;

        var companies = await db.Companies
            .Include(o => o.Research)
            .Include(o => o.People)
            .Where(o => o.EnrichStatus == EnrichStatus.FindingDecisionMaker
                     && o.Research != null
                     && o.Research.DecisionMakerFailCount < MaxFailures)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (companies.Count == 0) return;

        logger.LogInformation("Searching decision makers for {Count} companies", companies.Count);

        foreach (var company in companies)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                await ProcessCompanyAsync(company, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "FindDecisionMaker failed for {Domain}", company.Domain);
                RecordFailure(company, ex.Message);
            }

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to save decision maker search for {Domain}", company.Domain);
            }
        }
    }

    private async Task ProcessCompanyAsync(Company company, CancellationToken ct)
    {
        var research = company.Research!;

        // Fast path: website scrape already found a DM-titled person
        var knownDm = company.People.FirstOrDefault(o => TitleHelper.IsDecisionMakerTitle(o.Title));
        if (knownDm is not null)
        {
            PersistSuccess(company, research,
                new DecisionMakerExtraction(
                    Name: $"{knownDm.FirstName} {knownDm.LastName}",
                    Title: knownDm.Title,
                    LinkedinUrl: knownDm.LinkedinUrl,
                    SourceQuery: knownDm.SourcePage,
                    Confidence: 0.9),
                []);
            return;
        }

        var allSearches = new List<SerperSearchResponse>();

        // ── Stage A: always run ────────────────────────────────────────────────
        var stageA = await RunQueriesAsync(
            [
                $"site:linkedin.com/in \"{company.Name}\" (president OR owner OR founder OR CEO)",
                $"\"{company.Domain}\" (owner OR president OR founder OR CEO)",
            ], ct);
        allSearches.AddRange(stageA);

        // Regex short-circuit: LinkedIn title with owner-class keyword + /in/ link
        var regexHit = TryRegexExtract(stageA);
        if (regexHit is not null)
        {
            PersistSuccess(company, research, regexHit, allSearches);
            return;
        }

        // AI pass on Stage A
        var extraction = await ai.ExtractDecisionMakerAsync(company.Name, company.Domain, allSearches, ct);
        if (extraction is not null && extraction.Confidence >= HighConfidence)
        {
            PersistSuccess(company, research, extraction, allSearches);
            return;
        }

        // Bail early if Stage A returned literally nothing organic
        var stageAHadAnything = stageA.Any(o => o.Organic.Count > 0);

        // ── Stage B: zoominfo + bbb + manta + yelp + alignable + registry ─────
        if (stageAHadAnything)
        {
            var stageB = await RunQueriesAsync(
                [
                    $"site:zoominfo.com \"{company.Name}\"",
                    $"site:bbb.org \"{company.Name}\" owner",
                    $"site:manta.com \"{company.Name}\"",
                    $"site:yelp.com \"{company.Name}\" owner",
                    $"site:alignable.com \"{company.Name}\"",
                    $"\"{company.Name}\" \"registered agent\" OR \"managing member\" OR \"organizer\"",
                ], ct);
            allSearches.AddRange(stageB);

            extraction = await ai.ExtractDecisionMakerAsync(company.Name, company.Domain, allSearches, ct);
            if (extraction is not null && extraction.Confidence >= HighConfidence)
            {
                PersistSuccess(company, research, extraction, allSearches);
                return;
            }
        }

        // ── Stage C: last-resort generic ───────────────────────────────────────
        var stageC = await RunQueriesAsync(
            [$"\"{company.Name}\" contact owner email phone"], ct);
        allSearches.AddRange(stageC);

        extraction = await ai.ExtractDecisionMakerAsync(company.Name, company.Domain, allSearches, ct);
        if (extraction is not null
            && extraction.Confidence >= 0.5
            && !string.IsNullOrWhiteSpace(extraction.Name))
        {
            PersistSuccess(company, research, extraction, allSearches);
            return;
        }

        // Nothing usable across all stages
        research.DecisionMakerSearchJson = JsonSerializer.Serialize(new
        {
            queries = allSearches.Select(o => o.Query).ToArray(),
            results = allSearches,
            extraction,
        });
        RecordFailure(company, "No defensible decision-maker found");
    }

    private async Task<List<SerperSearchResponse>> RunQueriesAsync(
        IEnumerable<string> queries, CancellationToken ct)
    {
        var results = new List<SerperSearchResponse>();
        foreach (var q in queries)
        {
            var resp = await serper.SearchAsync(q, 10, ct);
            if (resp is not null) results.Add(resp);
        }
        return results;
    }

    private static DecisionMakerExtraction? TryRegexExtract(List<SerperSearchResponse> searches)
    {
        foreach (var search in searches)
        {
            foreach (var result in search.Organic)
            {
                // LinkedIn title: "Name – Title – Company | LinkedIn"
                if (result.Link.Contains("linkedin.com/in/", StringComparison.OrdinalIgnoreCase))
                {
                    var match = LinkedInTitleRegex().Match(result.Title);
                    if (match.Success)
                    {
                        var name = match.Groups[1].Value.Trim();
                        var title = match.Groups[2].Value.Trim();
                        if (TitleHelper.IsDecisionMakerTitle(title))
                            return new DecisionMakerExtraction(
                                Name: name,
                                Title: title,
                                LinkedinUrl: result.Link,
                                SourceQuery: search.Query,
                                Confidence: 0.8);
                    }
                }

                // Snippet: "Response from [Name], [Title]" (Yelp, Google reviews)
                if (!string.IsNullOrWhiteSpace(result.Snippet))
                {
                    var snippetMatch = OwnerResponseRegex().Match(result.Snippet);
                    if (snippetMatch.Success)
                    {
                        var name = snippetMatch.Groups[1].Value.Trim();
                        var title = snippetMatch.Groups[2].Value.Trim();
                        if (TitleHelper.IsDecisionMakerTitle(title))
                            return new DecisionMakerExtraction(
                                Name: name,
                                Title: title,
                                LinkedinUrl: null,
                                SourceQuery: search.Query,
                                Confidence: 0.75);
                    }
                }
            }
        }
        return null;
    }

    private void PersistSuccess(
        Company company,
        CompanyResearch research,
        DecisionMakerExtraction extraction,
        List<SerperSearchResponse> searches)
    {
        if (!string.IsNullOrWhiteSpace(extraction.Name))
        {
            var (first, last) = EmailPatternHelper.SplitName(extraction.Name);
            if (!string.IsNullOrEmpty(first))
            {
                UpsertPerson(company, first, last, extraction);
            }
        }

        research.DecisionMakerSearchJson = JsonSerializer.Serialize(new
        {
            queries = searches.Select(o => o.Query).ToArray(),
            results = searches,
            extraction,
        });
        research.DecisionMakerSearchedAt = DateTimeOffset.UtcNow;
        research.DecisionMakerFailCount = 0;
        research.ErrorMessage = null;
        company.EnrichStatus = EnrichStatus.Enriched;

        logger.LogInformation("Decision maker found for {Domain}: {Name} ({Title}) confidence={Confidence:F2}",
            company.Domain, extraction.Name, extraction.Title, extraction.Confidence);
    }

    private void UpsertPerson(Company company, string first, string last, DecisionMakerExtraction extraction)
    {
        var fullNameKey = $"{first} {last}".ToLowerInvariant().Trim();
        var existing = company.People.FirstOrDefault(o =>
            $"{o.FirstName} {o.LastName}".Equals($"{first} {last}", StringComparison.OrdinalIgnoreCase)
            || $"{o.FirstName} {o.LastName}".ToLowerInvariant().Trim() == fullNameKey);

        if (existing is not null)
        {
            if (!string.IsNullOrWhiteSpace(extraction.Title)) existing.Title = extraction.Title;
            if (!string.IsNullOrWhiteSpace(extraction.LinkedinUrl)) existing.LinkedinUrl = extraction.LinkedinUrl;
            existing.Source = PersonSource.WebSearch;
            return;
        }

        var person = new LeadPerson
        {
            FirstName = EmailPatternHelper.Capitalize(first),
            LastName = EmailPatternHelper.Capitalize(last),
            Title = string.IsNullOrWhiteSpace(extraction.Title) ? "Owner" : extraction.Title,
            LinkedinUrl = extraction.LinkedinUrl,
            SourcePage = $"web-search:{extraction.SourceQuery}",
            Source = PersonSource.WebSearch,
            Company = company,
            Emails = EmailPatternHelper.GuessEmails(first, last, company.Domain),
        };
        db.LeadPersons.Add(person);
    }

    private void RecordFailure(Company company, string error)
    {
        var research = company.Research!;
        research.DecisionMakerFailCount++;
        research.ErrorMessage = error;

        if (research.DecisionMakerFailCount >= MaxFailures)
        {
            company.EnrichStatus = EnrichStatus.SerperFailed;
            logger.LogWarning("Marking {Domain} SerperFailed after {Max} attempts", company.Domain, MaxFailures);
        }
        // else leave status as FindingDecisionMaker so next tick retries
    }
}
