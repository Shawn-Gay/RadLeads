namespace RadLeads.Api.Services;

public record CrawledPage(string Url, string Label, string Text);

public record CrawlResult(string Domain, List<CrawledPage> Pages, string? MeetingLink)
{
    // Cap each page so later pages (About, Team) aren't truncated out by a long Homepage.
    // 10 pages × 1 500 chars = 15 000 chars max — well within the AI's 14 000-char window.
    private const int CharsPerPage = 4_000;

    public string CombinedText => string.Join("\n\n---\n\n",
        Pages.Select(p =>
        {
            var body = p.Text.Length > CharsPerPage ? p.Text[..CharsPerPage] + "…" : p.Text;
            return $"[{p.Label}]\n{body}";
        }));
}

public interface IScrapingService
{
    Task<CrawlResult> CrawlAsync(string domain, CancellationToken ct = default);
}
