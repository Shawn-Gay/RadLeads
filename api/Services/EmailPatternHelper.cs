using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

/// <summary>
/// Shared email-pattern generation logic.
/// Used by SummarizeLeadsJob (Job 2) and will be reused by EmailPatternJob (Job 4)
/// when it is activated.
/// </summary>
public static class EmailPatternHelper
{
    public static List<LeadEmail> GuessEmails(string first, string last, string domain,
        EmailSource source = EmailSource.Guessed)
    {
        var addresses = string.IsNullOrEmpty(last)
            ? [$"{first}@{domain}"]
            : (string[])
            [
                $"{first}@{domain}",
                $"{first}.{last}@{domain}",
                $"{first[0]}{last}@{domain}",
                $"{first[0]}.{last}@{domain}",
            ];

        return addresses
            .Distinct()
            .Select((a, i) => new LeadEmail
            {
                Address   = a,
                Source    = source,
                IsPrimary = i == 0,
                Status    = EmailStatus.Unknown,
            })
            .ToList();
    }

    public static (string first, string last) SplitName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', 2);
        var first = parts[0].ToLowerInvariant();
        var last  = parts.Length > 1
            ? parts[1].ToLowerInvariant().Replace(" ", "")
            : string.Empty;
        return (first, last);
    }

    public static string Capitalize(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToUpperInvariant(s[0]) + s[1..];
}
