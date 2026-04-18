using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record SendFollowUpEmailRequest(
    Guid FromAccountId,
    Guid CompanyId,
    Guid? PersonId,
    string ToEmail,
    string Subject,
    string Body,
    Guid? EmailTemplateId = null
);

public record FollowUpEmailDto(
    Guid Id,
    Guid? PersonId,
    Guid? CompanyId,
    Guid EmailAccountId,
    string ToAddress,
    string Subject,
    OutboundEmailStatus Status,
    DateTimeOffset? SentAt,
    DateTimeOffset CreatedAt,
    string? ErrorMessage,
    int OpenCount,
    int ClickCount
);
