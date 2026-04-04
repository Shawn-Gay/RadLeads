using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record TestConnectionRequest(
    string Email,
    string Password,
    string SmtpHost,
    int SmtpPort,
    string ImapHost,
    int ImapPort
);

public record CreateEmailAccountRequest(
    string Email,
    AccountProvider Provider,
    int DailyLimit,
    string Password,
    string SmtpHost,
    int SmtpPort,
    string ImapHost,
    int ImapPort
);

public record EmailAccountDto(
    Guid Id,
    string Email,
    AccountProvider Provider,
    AccountStatus Status,
    int? Health,
    int SentToday,
    int DailyLimit,
    int? WarmupDay,
    int WarmupTotalDays,
    string SmtpHost,
    int SmtpPort,
    string ImapHost,
    int ImapPort,
    DateTimeOffset CreatedAt
)
{
    public static EmailAccountDto From(EmailAccount a, int sentToday) => new(
        a.Id, a.Email, a.Provider, a.Status, a.Health,
        sentToday, a.DailyLimit,
        a.WarmupDay, a.WarmupTotalDays,
        a.SmtpHost, a.SmtpPort, a.ImapHost, a.ImapPort,
        a.CreatedAt);
}
