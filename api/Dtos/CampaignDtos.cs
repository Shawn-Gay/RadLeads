using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record CampaignSendDto(
    Guid Id,
    Guid Token,
    string PersonName,
    string ToAddress,
    int StepDay,
    string StepSubject,
    DateTimeOffset? SentAt,
    DateTimeOffset? OpenedAt,
    DateTimeOffset? ClickedAt,
    DateTimeOffset? RepliedAt,
    DateTimeOffset? BouncedAt);

public record CampaignStepDto(Guid Id, int Day, string Subject, string Body);

public record CampaignDto(
    Guid Id,
    string Name,
    CampaignStatus Status,
    int EnrolledCount,
    int Sent,
    int Opens,
    int Replies,
    List<Guid> SenderIds,
    List<CampaignStepDto> Steps);

public record UpsertStepRequest(Guid? Id, int Day, string Subject, string Body);

public record UpsertCampaignRequest(
    string Name,
    List<Guid> SenderIds,
    List<UpsertStepRequest> Steps);
