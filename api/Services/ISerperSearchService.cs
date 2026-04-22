namespace RadLeads.Api.Services;

public record SerperOrganicResult(string Title, string Link, string? Snippet);

public record SerperSearchResponse(string Query, List<SerperOrganicResult> Organic);

public interface ISerperSearchService
{
    Task<SerperSearchResponse?> SearchAsync(
        string query,
        int numResults = 10,
        CancellationToken ct = default);
}
