using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record EmailTemplateDto(
    Guid Id,
    string Name,
    string Subject,
    string Body,
    bool IsArchived,
    List<EmailTemplateOutcomeDto> OutcomeAssignments,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record EmailTemplateOutcomeDto(
    Guid Id,
    CallOutcome Outcome,
    bool IsDefault);

public record UpsertEmailTemplateInput(string Name, string Subject, string Body);

public record EmailTemplateOutcomeInput(CallOutcome Outcome, bool IsDefault);

public record EmailTemplateStatsDto(
    Guid EmailTemplateId,
    int TotalSends,
    Dictionary<string, int> StatusCounts);
