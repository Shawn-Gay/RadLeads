namespace RadLeads.Api.Services;

public record ExtractedPerson(string Name, string Title);

public record CompanySummaryResult(
    string Summary,
    string? RecentNews,
    List<string> PainPoints,
    List<ExtractedPerson> KeyPeople,
    List<string> RecentEvents
);

public record CampaignStepResult(string Subject, string Body);

public interface IAiService
{
    Task<CompanySummaryResult?> SummarizeCompanyAsync(
        string domain,
        string crawledText,
        CancellationToken ct = default);

    Task<CampaignStepResult?> GenerateCampaignStepAsync(
        int stepIndex,
        int totalSteps,
        int day,
        CancellationToken ct = default);

    Task<string?> DraftReplyAsync(
        string senderName,
        string lastMessage,
        CancellationToken ct = default);
}
