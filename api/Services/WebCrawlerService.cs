using System.Text.RegularExpressions;
using System.Xml.Linq;
using AngleSharp;
using AngleSharp.Html.Dom;

namespace RadLeads.Api.Services;

public class WebCrawlerService(IHttpClientFactory httpFactory, ILogger<WebCrawlerService> logger)
    : IScrapingService
{
    private static readonly Regex KeywordPattern = new(
        @"about|contact|team|meet|leadership|service|solution|pricing|news|press|blog|career|company|location|office|faq|invest|partner",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex MeetingPattern = new(
        @"calendly\.com|hubspot\.com/meetings|tidycal\.com|savvycal\.com|wa\.me",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex TelHrefPattern = new(
        @"href=""tel:([+\d\s\-().]+)""",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex PhoneTextPattern = new(
        @"(?<!\d)(\+?1?\s*[-.]?\s*\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})(?!\d)",
        RegexOptions.Compiled);

    private static readonly (string Path, string Label)[] FallbackPaths =
    [
        ("/about",            "About"),
        ("/about-us",         "About Us"),
        ("/team",             "Team"),
        ("/meet-the-team",    "Meet The Team"),
        ("/leadership",       "Leadership"),
        ("/contact",          "Contact"),
        ("/contact-us",       "Contact Us"),
        ("/services",         "Services"),
        ("/solutions",        "Solutions"),
        ("/pricing",          "Pricing"),
        ("/news",             "News"),
        ("/press",            "Press"),
        ("/blog",             "Blog"),
        ("/careers",          "Careers"),
        ("/company",          "Company"),
        ("/locations",        "Locations"),
        ("/offices",          "Offices"),
        ("/faq",              "FAQ"),
        ("/investors",        "Investors"),
        ("/partners",         "Partners"),
    ];

    private const int MaxPages      = 15;
    private const int PageDelayMs   = 300;
    private const int TimeoutMs     = 10_000;

    public async Task<CrawlResult> CrawlAsync(string domain, CancellationToken ct = default)
    {
        var baseUrl = NormalizeBaseUrl(domain);
        var http = httpFactory.CreateClient("scraper");

        // ── 1. Discover URLs ─────────────────────────────────────────────────
        var discovered = new List<(string Url, string Label)>();

        discovered.AddRange(await TrySitemapAsync(http, baseUrl, ct));

        if (discovered.Count < 3)
            discovered.AddRange(await TrySpiderHomepageAsync(http, baseUrl, ct));

        if (discovered.Count < 3)
            discovered.AddRange(FallbackPaths.Select(o => ($"{baseUrl}{o.Path}", o.Label)));

        // Always start with homepage; deduplicate the rest
        var queue = new List<(string Url, string Label)> { (baseUrl, "Homepage") };
        queue.AddRange(discovered
            .DistinctBy(o => o.Url)
            .Where(o => o.Url != baseUrl));
        queue = queue.Take(MaxPages).ToList();

        // ── 2. Fetch + extract each page ─────────────────────────────────────
        var pages       = new List<CrawledPage>();
        string? meeting = null;
        string? phone   = null;

        foreach (var (url, label) in queue)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                await Task.Delay(PageDelayMs, ct);
                var html = await FetchAsync(http, url, ct);
                if (html is null) continue;

                if (meeting is null)
                {
                    var m = MeetingPattern.Match(html);
                    if (m.Success)
                        meeting = ExtractMeetingHref(html, m.Value);
                }

                if (phone is null)
                    phone = ExtractPhone(html);

                var text = await StripToMarkdownAsync(html, url);
                if (text.Length > 100)
                    pages.Add(new CrawledPage(url, label, text));
            }
            catch (Exception ex)
            {
                logger.LogDebug("Skipping {Url}: {Msg}", url, ex.Message);
            }
        }

        return new CrawlResult(domain, pages, meeting, phone);
    }

    // ── Discovery ────────────────────────────────────────────────────────────

    private async Task<List<(string, string)>> TrySitemapAsync(
        HttpClient http, string baseUrl, CancellationToken ct)
    {
        try
        {
            var xml = await FetchAsync(http, $"{baseUrl}/sitemap.xml", ct);
            if (xml is null) return [];

            var doc = XDocument.Parse(xml);
            XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

            // Sitemap index — fetch first child sitemap
            var childUrl = doc.Descendants(ns + "sitemap")
                .Select(o => o.Element(ns + "loc")?.Value)
                .FirstOrDefault(o => o is not null);

            if (childUrl is not null)
            {
                var child = await FetchAsync(http, childUrl, ct);
                if (child is not null) doc = XDocument.Parse(child);
            }

            return doc.Descendants(ns + "url")
                .Select(o => o.Element(ns + "loc")?.Value)
                .OfType<string>()
                .Where(o => IsSameDomain(o, baseUrl) && KeywordPattern.IsMatch(o))
                .Take(MaxPages - 1)
                .Select(o => (o, PathToLabel(o)))
                .ToList();
        }
        catch { return []; }
    }

    private async Task<List<(string, string)>> TrySpiderHomepageAsync(
        HttpClient http, string baseUrl, CancellationToken ct)
    {
        try
        {
            var html = await FetchAsync(http, baseUrl, ct);
            if (html is null) return [];

            var context = BrowsingContext.New(Configuration.Default);
            var doc = await context.OpenAsync(
                req => req.Content(html).Address(baseUrl), ct);

            return doc.QuerySelectorAll("a[href]")
                .OfType<IHtmlAnchorElement>()
                .Select(o => o.Href)
                .Where(o => IsSameDomain(o, baseUrl) && KeywordPattern.IsMatch(o))
                .Distinct()
                .Take(MaxPages - 1)
                .Select(o => (o, PathToLabel(o)))
                .ToList();
        }
        catch { return []; }
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────

    private static async Task<string?> FetchAsync(HttpClient http, string url, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeoutMs);
        try
        {
            var res = await http.GetAsync(url, cts.Token);
            if (!res.IsSuccessStatusCode) return null;
            return await res.Content.ReadAsStringAsync(cts.Token);
        }
        catch { return null; }
    }

    // ── Text extraction ───────────────────────────────────────────────────────

    private static async Task<string> StripToMarkdownAsync(string html, string baseUrl)
    {
        var context = BrowsingContext.New(Configuration.Default);
        var doc = await context.OpenAsync(req => req.Content(html).Address(baseUrl));

        foreach (var el in doc.QuerySelectorAll("script,style,nav,footer,header,noscript,iframe,svg"))
            el.Remove();

        var sb = new System.Text.StringBuilder();
        WalkNode(doc.Body, sb);
        return Regex.Replace(sb.ToString(), @"\n{3,}", "\n\n").Trim();
    }

    private static void WalkNode(AngleSharp.Dom.INode? node, System.Text.StringBuilder sb)
    {
        if (node is null) return;
        foreach (var child in node.ChildNodes)
        {
            if (child is AngleSharp.Dom.IText text)
            {
                sb.Append(Regex.Replace(text.TextContent, @"[ \t]+", " "));
            }
            else if (child is AngleSharp.Dom.IElement el)
            {
                var tag = el.TagName.ToLowerInvariant();
                var inner = el.TextContent.Trim();
                switch (tag)
                {
                    case "h1": sb.Append($"\n# {inner}\n"); break;
                    case "h2": sb.Append($"\n## {inner}\n"); break;
                    case "h3": sb.Append($"\n### {inner}\n"); break;
                    case "h4": case "h5": case "h6": sb.Append($"\n#### {inner}\n"); break;
                    case "li":
                        if (!string.IsNullOrWhiteSpace(inner)) sb.Append($"\n- {inner}");
                        break;
                    case "p":
                        if (!string.IsNullOrWhiteSpace(inner)) sb.Append($"\n{inner}\n");
                        break;
                    default: WalkNode(el, sb); break;
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string NormalizeBaseUrl(string domain)
    {
        if (!domain.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            domain = $"https://{domain}";
        return domain.TrimEnd('/');
    }

    private static bool IsSameDomain(string url, string baseUrl)
    {
        try
        {
            var a = new Uri(url).Host.TrimStart('w', '.');
            var b = new Uri(baseUrl).Host.TrimStart('w', '.');
            return string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
        }
        catch { return false; }
    }

    private static string PathToLabel(string url)
    {
        try
        {
            var seg = new Uri(url).AbsolutePath.Trim('/').Split('/')[0];
            return seg.Length == 0 ? "Homepage"
                : char.ToUpper(seg[0]) + seg[1..].Replace('-', ' ');
        }
        catch { return url; }
    }

    private static string? ExtractPhone(string html)
    {
        var telMatch = TelHrefPattern.Match(html);
        if (telMatch.Success)
            return NormalizePhone(telMatch.Groups[1].Value);

        var textMatch = PhoneTextPattern.Match(html);
        return textMatch.Success ? NormalizePhone(textMatch.Groups[1].Value) : null;
    }

    private static string NormalizePhone(string raw) =>
        Regex.Replace(raw.Trim(), @"[^\d+]", "");

    private static string? ExtractMeetingHref(string html, string pattern)
    {
        var m = Regex.Match(html,
            $@"href=""([^""]*{Regex.Escape(pattern)}[^""]*)""",
            RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value : null;
    }
}
