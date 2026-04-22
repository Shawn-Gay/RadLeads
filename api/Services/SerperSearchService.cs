using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RadLeads.Api.Services;

public class SerperSearchService(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<SerperSearchService> logger) : ISerperSearchService
{
    private const string Endpoint = "https://google.serper.dev/search";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<SerperSearchResponse?> SearchAsync(
        string query, int numResults = 10, CancellationToken ct = default)
    {
        var apiKey = config["Serper:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("Serper:ApiKey not configured — skipping web search");
            return null;
        }

        var http = httpFactory.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = JsonContent.Create(new { q = query, num = numResults }),
        };
        req.Headers.Add("X-API-KEY", apiKey);

        try
        {
            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                logger.LogWarning("Serper non-2xx for {Query}: {Status}", query, resp.StatusCode);
                return null;
            }

            var payload = await resp.Content.ReadFromJsonAsync<SerperRawResponse>(JsonOpts, ct);
            var organic = payload?.Organic
                ?.Select(o => new SerperOrganicResult(o.Title ?? "", o.Link ?? "", o.Snippet))
                .ToList() ?? [];

            return new SerperSearchResponse(query, organic);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Serper request failed for {Query}", query);
            return null;
        }
    }

    private record SerperRawOrganic(
        [property: JsonPropertyName("title")] string? Title,
        [property: JsonPropertyName("link")] string? Link,
        [property: JsonPropertyName("snippet")] string? Snippet);

    private record SerperRawResponse(
        [property: JsonPropertyName("organic")] List<SerperRawOrganic>? Organic);
}
