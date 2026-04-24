using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record LogCallInput(
    Guid? PersonId,
    Guid? CompanyId,
    string CalledPhone,
    CallOutcome Outcome,
    string? Notes,
    DateTimeOffset? CallbackAt  = null,
    Guid? ScriptId              = null,
    Guid? DialerId              = null,
    Guid? CallSessionId         = null);

public record UpdateCallLogInput(string? Notes);

public record CallLogDto(
    Guid Id,
    Guid? PersonId,
    Guid? CompanyId,
    string CalledPhone,
    CallOutcome Outcome,
    string? Notes,
    DateTimeOffset CalledAt,
    Guid? ScriptId      = null,
    Guid? DialerId      = null,
    Guid? CallSessionId = null);
