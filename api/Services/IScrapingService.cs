namespace RadLeads.Api.Services;

public record CrawledPage(string Url, string Label, string Text);

public record CrawlResult(string Domain, List<CrawledPage> Pages, string? MeetingLink, string? Phone)
{
    // Cap each page so later pages (Team, About) aren't truncated out by a long Homepage.
    // 15 pages × 5 000 chars = 75 000 chars max, truncated to 60 000 in the AI call.
    private const int CharsPerPage = 5_000;

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
