namespace RadLeads.Api.Services;

public static class TitleHelper
{
    private static readonly string[] DecisionMakerKeywords =
    [
        "owner",
        "founder",
        "co-founder",
        "cofounder",
        "president",
        "ceo",
        "coo",
        "principal",
        "proprietor",
        "managing partner",
    ];

    public static bool IsDecisionMakerTitle(string? title) =>
        !string.IsNullOrWhiteSpace(title)
        && DecisionMakerKeywords.Any(kw =>
            title.Contains(kw, StringComparison.OrdinalIgnoreCase));
}
