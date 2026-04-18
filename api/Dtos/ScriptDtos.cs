using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record ScriptDto(
    Guid Id,
    string Name,
    string Body,
    bool IsArchived,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record UpsertScriptInput(string Name, string Body);

public record ScriptFeedbackInput(
    Guid? CallLogId,
    Guid? DialerId,
    string Note,
    string? BodySnapshot);

public record ScriptFeedbackDto(
    Guid Id,
    Guid ScriptId,
    Guid? CallLogId,
    Guid? DialerId,
    string Note,
    string? BodySnapshot,
    DateTimeOffset CreatedAt);

public record ScriptStatsDto(
    Guid ScriptId,
    int TotalCalls,
    Dictionary<string, int> OutcomeCounts,
    List<ScriptStatsPerDialer> PerDialer);

public record ScriptStatsPerDialer(
    Guid DialerId,
    string DialerName,
    int TotalCalls,
    Dictionary<string, int> OutcomeCounts);
