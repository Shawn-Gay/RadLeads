using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record WarmupActivityDto(
    Guid Id,
    Guid AccountId,
    string PartnerEmail,
    WarmupAction Action,
    DateTimeOffset CreatedAt);
