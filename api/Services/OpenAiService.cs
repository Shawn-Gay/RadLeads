using System.ClientModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using OpenAI;
using OpenAI.Chat;

namespace RadLeads.Api.Services;

public class OpenAiService(IConfiguration config, ILogger<OpenAiService> logger) : IAiService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    // Max chars of crawled text sent to AI — keeps token cost predictable
    private const int MaxTextChars = 14_000;

    // Returns null (and logs a warning) when the API key is not configured.
    private ChatClient? GetChatClient()
    {
        var apiKey = config["OpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("OpenAI:ApiKey not configured — skipping AI call");
            return null;
        }
        var model = config["OpenAI:Model"] ?? "gpt-4o-mini";
        return new OpenAIClient(new ApiKeyCredential(apiKey)).GetChatClient(model);
    }

    public async Task<CampaignStepResult?> GenerateCampaignStepAsync(
        int stepIndex, int totalSteps, int day, CancellationToken ct = default)
    {
        var chat = GetChatClient();
        if (chat is null) return null;

        var position = stepIndex == 0 ? "first (cold outreach)" :
                       stepIndex == totalSteps - 1 ? "final follow-up" :
                       $"follow-up #{stepIndex}";

        var system = new SystemChatMessage("""
            You are an expert B2B cold email copywriter specialising in outreach for roofing contractors.
            Respond with valid JSON only — no markdown, no extra text.
            Use merge tokens exactly as given: {{firstName}}, {{company}}, {{city}}, {{icebreaker}}.
            """);

        var user = new UserChatMessage($$"""
            Write the {{position}} email in a {{totalSteps}}-step sequence (this step sends on day {{day}}).
            Keep subject lines short and curiosity-driven. Body: 3–5 sentences max, conversational, no fluff.

            Return JSON:
            { "subject": "...", "body": "..." }
            """);

        try
        {
            var result = await chat.CompleteChatAsync([system, user], cancellationToken: ct);
            var json = result.Value.Content[0].Text;
            return JsonSerializer.Deserialize<CampaignStepResult>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI generate-step failed (stepIndex={StepIndex})", stepIndex);
            return null;
        }
    }

    public async Task<string?> DraftReplyAsync(
        string senderName, string lastMessage, CancellationToken ct = default)
    {
        var chat = GetChatClient();
        if (chat is null) return null;

        var system = new SystemChatMessage("""
            You are Shawn, a B2B sales rep at RadcoreAI helping roofing contractors get more leads.
            Write a short, warm, natural reply — 2–4 sentences. No subject line. Sign off as "Shawn".
            """);

        var user = new UserChatMessage($$"""
            The prospect {{senderName}} just replied with:

            {{lastMessage}}

            Draft a reply that moves the conversation toward booking a 15-minute call.
            """);

        try
        {
            var result = await chat.CompleteChatAsync([system, user], cancellationToken: ct);
            return result.Value.Content[0].Text.Trim();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI draft-reply failed for {SenderName}", senderName);
            return null;
        }
    }

    public async Task<CompanySummaryResult?> SummarizeCompanyAsync(
        string domain, string crawledText, CancellationToken ct = default)
    {
        var chat = GetChatClient();
        if (chat is null) return null;

        var truncated = crawledText.Length > MaxTextChars
            ? crawledText[..MaxTextChars] + "\n[truncated]"
            : crawledText;

        var system = new SystemChatMessage("""
            You are a B2B sales intelligence researcher.
            Analyze company website content and respond with valid JSON only — no markdown, no extra text.
            """);

        var user = new UserChatMessage($$"""
            Company domain: {{domain}}

            Website content:
            {{truncated}}

            Return JSON matching this exact schema (use empty arrays, not null, for list fields):
            {
              "summary": "2-3 sentence description of what the company does and who they serve",
              "recentNews": "Recent news, funding, product launches, or announcements (null if none found)",
              "painPoints": ["pain point 1", "pain point 2"],
              "keyPeople": [{"name": "Full Name", "title": "Job Title"}],
              "recentEvents": ["event 1", "event 2"]
            }
            """);

        try
        {
            var result = await chat.CompleteChatAsync([system, user], cancellationToken: ct);
            var json = result.Value.Content[0].Text;
            return JsonSerializer.Deserialize<CompanySummaryResult>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI summarization failed for {Domain}", domain);
            return null;
        }
    }
}
