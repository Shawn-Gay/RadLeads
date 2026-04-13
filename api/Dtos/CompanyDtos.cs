using RadLeads.Api.Models;

namespace RadLeads.Api.Dtos;

public record LeadEmailDto(
    string Address,
    EmailSource Source,
    bool IsPrimary,
    EmailStatus Status);

public record LeadPersonDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Title,
    string? LinkedinUrl,
    string? Phone,
    string? City,
    string? Icebreaker,
    string? PainPoint,
    string? SourcePage,
    List<LeadEmailDto> Emails,
    List<Guid> CampaignIds);

public record CompanyDto(
    Guid Id,
    string Domain,
    string Name,
    string? Employees,
    string? Summary,
    string? RecentNews,
    string? Phone,
    string? Email,
    EnrichStatus EnrichStatus,
    DateTimeOffset? ResearchedAt,
    DateTimeOffset? EnrichedAt,
    string? MeetingLink,
    int PagesCrawledCount,
    Guid? AssignedToId,
    DateTimeOffset? AssignedAt,
    DialDisposition DialDisposition,
    List<LeadPersonDto> People);

public record AssignLeadsRequest(Guid DialerId, int Count);
public record DropLeadRequest(DialDisposition Disposition);

public record ImportPersonInput(
    string Domain,
    string? CompanyName,
    string FirstName,
    string LastName,
    string? Title,
    string Email,
    string? Phone,
    string? City,
    string? LinkedinUrl,
    string? CallStatus);

public record ImportCompanyInput(
    string Domain,
    string? CompanyName,
    string? Phone,
    string? Email,
    string? Employees,
    string? CallStatus);
