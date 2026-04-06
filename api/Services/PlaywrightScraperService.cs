using System.Text.RegularExpressions;
using System.Xml.Linq;
using AngleSharp;
using AngleSharp.Html.Dom;
using Microsoft.Playwright;

namespace RadLeads.Api.Services;

/// <summary>
/// Headless-Chromium scraper via Playwright. Bypasses JS challenges and WAF bot checks
/// that block plain HttpClient requests.
/// </summary>
public sealed class PlaywrightScraperService(ILogger<PlaywrightScraperService> logger)
    : IScrapingService, IAsyncDisposable
{
    private static readonly Regex KeywordPattern = new(
        @"about|contact|team|leadership|service|solution|pricing|news|press|blog|career|company|location|office|faq|invest|partner",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex MeetingPattern = new(
        @"calendly\.com|hubspot\.com/meetings|tidycal\.com|savvycal\.com|wa\.me",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly (string Path, string Label)[] FallbackPaths =
    [
        ("/about",       "About"),
        ("/about-us",    "About Us"),
        ("/team",        "Team"),
        ("/leadership",  "Leadership"),
        ("/contact",     "Contact"),
        ("/contact-us",  "Contact Us"),
        ("/services",    "Services"),
        ("/solutions",   "Solutions"),
        ("/pricing",     "Pricing"),
        ("/news",        "News"),
        ("/press",       "Press"),
        ("/blog",        "Blog"),
        ("/careers",     "Careers"),
        ("/company",     "Company"),
        ("/locations",   "Locations"),
        ("/offices",     "Offices"),
        ("/faq",         "FAQ"),
        ("/investors",   "Investors"),
        ("/partners",    "Partners"),
    ];

    private const int MaxPages    = 10;
    private const int PageDelayMs = 500;

    // Lazy-init — browser starts on first crawl request, stays alive for the process lifetime
    private IPlaywright? _playwright;
    private IBrowser?    _browser;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private async Task<IBrowser> GetBrowserAsync()
    {
        if (_browser is { IsConnected: true }) return _browser;

        await _lock.WaitAsync();
        try
        {
            if (_browser is { IsConnected: true }) return _browser;

            _playwright = await Playwright.CreateAsync();
            _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = true,
                Args     = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            });
            logger.LogInformation("Playwright Chromium started");
            return _browser;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<CrawlResult> CrawlAsync(string domain, CancellationToken ct = default)
    {
        var baseUrl = NormalizeBaseUrl(domain);
        var browser = await GetBrowserAsync();

        // ── 1. Discover URLs (sitemap first, then homepage spider, then fallback) ──
        var discovered = new List<(string Url, string Label)>();
        discovered.AddRange(await TrySitemapAsync(baseUrl, ct));

        if (discovered.Count < 3)
            discovered.AddRange(await TrySpiderHomepageAsync(browser, baseUrl, ct));

        if (discovered.Count < 3)
            discovered.AddRange(FallbackPaths.Select(o => ($"{baseUrl}{o.Path}", o.Label)));

        var queue = new List<(string Url, string Label)> { (baseUrl, "Homepage") };
        queue.AddRange(discovered.DistinctBy(o => o.Url).Where(o => o.Url != baseUrl));
        queue = queue.Take(MaxPages).ToList();

        // ── 2. Fetch each page with Playwright ───────────────────────────────────
        var pages   = new List<CrawledPage>();
        string? meeting = null;

        // Reuse one context for the whole crawl (same cookies/session if needed)
        await using var context = await browser.NewContextAsync(new BrowserNewContextOptions
        {
            UserAgent     = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            ViewportSize  = new ViewportSize { Width = 1280, Height = 800 },
            Locale        = "en-US",
        });

        foreach (var (url, label) in queue)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                await Task.Delay(PageDelayMs, ct);
                var (html, text) = await FetchPageAsync(context, url);
                if (html is null || text is null) continue;

                if (meeting is null)
                {
                    var m = MeetingPattern.Match(html);
                    if (m.Success) meeting = ExtractMeetingHref(html, m.Value);
                }

                if (text.Length > 100)
                    pages.Add(new CrawledPage(url, label, text));
            }
            catch (Exception ex)
            {
                logger.LogDebug("Skipping {Url}: {Msg}", url, ex.Message);
            }
        }

        return new CrawlResult(domain, pages, meeting);
    }

    private static async Task<(string? Html, string? Text)> FetchPageAsync(
        IBrowserContext context, string url)
    {
        var page = await context.NewPageAsync();
        try
        {
            var response = await page.GotoAsync(url, new PageGotoOptions
            {
                WaitUntil = WaitUntilState.DOMContentLoaded,
                Timeout   = 20_000,
            });

            if (response is null || !response.Ok) return (null, null);

            var html = await page.ContentAsync();

            // Strip noise then grab visible text
            await page.EvaluateAsync(
                "() => document.querySelectorAll('script,style,nav,footer,header,noscript,iframe,svg').forEach(el => el.remove())");

            var text = await page.InnerTextAsync("body");
            text = Regex.Replace(text, @"\s+", " ").Trim();

            return (html, text);
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    // ── Discovery ─────────────────────────────────────────────────────────────

    private async Task<List<(string, string)>> TrySitemapAsync(string baseUrl, CancellationToken ct)
    {
        // Sitemaps are plain XML — no JS needed, plain HttpClient is fine
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            http.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");

            var xml = await http.GetStringAsync($"{baseUrl}/sitemap.xml", ct);
            var doc = XDocument.Parse(xml);
            XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

            var childUrl = doc.Descendants(ns + "sitemap")
                .Select(o => o.Element(ns + "loc")?.Value)
                .FirstOrDefault(o => o is not null);

            if (childUrl is not null)
            {
                var childXml = await http.GetStringAsync(childUrl, ct);
                doc = XDocument.Parse(childXml);
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
        IBrowser browser, string baseUrl, CancellationToken ct)
    {
        try
        {
            await using var ctx  = await browser.NewContextAsync();
            var page = await ctx.NewPageAsync();
            try
            {
                var res = await page.GotoAsync(baseUrl, new PageGotoOptions
                {
                    WaitUntil = WaitUntilState.DOMContentLoaded,
                    Timeout   = 15_000,
                });
                if (res is null || !res.Ok) return [];

                var html = await page.ContentAsync();
                var context = BrowsingContext.New(Configuration.Default);
                var doc = await context.OpenAsync(req => req.Content(html).Address(baseUrl), ct);

                return doc.QuerySelectorAll("a[href]")
                    .OfType<IHtmlAnchorElement>()
                    .Select(o => o.Href)
                    .Where(o => IsSameDomain(o, baseUrl) && KeywordPattern.IsMatch(o))
                    .Distinct()
                    .Take(MaxPages - 1)
                    .Select(o => (o, PathToLabel(o)))
                    .ToList();
            }
            finally { await page.CloseAsync(); }
        }
        catch { return []; }
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

    private static string? ExtractMeetingHref(string html, string pattern)
    {
        var m = Regex.Match(html,
            $@"href=""([^""]*{Regex.Escape(pattern)}[^""]*)""",
            RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value : null;
    }

    public async ValueTask DisposeAsync()
    {
        if (_browser is not null) await _browser.DisposeAsync();
        _playwright?.Dispose();
    }
}
