using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record LogCallInput(
    Guid? PersonId,
    Guid? CompanyId,
    string CalledPhone,
    CallOutcome Outcome,
    string? Notes);

public record CallLogDto(
    Guid Id,
    Guid? PersonId,
    Guid? CompanyId,
    string CalledPhone,
    CallOutcome Outcome,
    string? Notes,
    DateTimeOffset CalledAt);
