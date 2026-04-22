namespace RadLeads.Api.Dtos;

public record StartSessionInput(Guid? DialerId);

public record PatchSessionInput(
    int? LeadsCalledCount    = null,
    int? TotalPausedSeconds  = null,
    bool End                 = false);

public record CallSessionDto(
    Guid Id,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    int LeadsCalledCount,
    int TotalPausedSeconds,
    Guid? DialerId);

public record CallSessionListDto(
    Guid Id,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    int LeadsCalledCount,
    int TotalPausedSeconds,
    Guid? DialerId,
    string? DialerName);
