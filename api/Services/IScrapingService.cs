namespace RadLeads.Api.Services;

public record CrawledPage(string Url, string Label, string Text);

public record CrawlResult(string Domain, List<CrawledPage> Pages, string? MeetingLink)
{
    public string CombinedText => string.Join("\n\n---\n\n",
        Pages.Select(p => $"[{p.Label}]\n{p.Text}"));
}

public interface IScrapingService
{
    Task<CrawlResult> CrawlAsync(string domain, CancellationToken ct = default);
}
