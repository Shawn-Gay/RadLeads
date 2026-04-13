namespace RadLeads.Api.Models;

public class CompanyResearch : BaseEntity
{
    // ── Scrape phase ─────────────────────────────────────────────────────────
    public string? RawText { get; set; }
    public string? MeetingLink { get; set; }
    public string? PagesCrawledJson { get; set; }   // JSON: [{label, url}]
    public DateTimeOffset? ScrapedAt { get; set; }

    // ── AI summary phase ─────────────────────────────────────────────────────
    public string? SummaryJson { get; set; }         // JSON: CompanySummaryResult
    public DateTimeOffset? SummarizedAt { get; set; }

    public string? ErrorMessage { get; set; }
    public int ScrapeFailCount { get; set; }

    public Company Company { get; set; } = null!;
}
