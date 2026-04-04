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
    List<LeadEmailDto> Emails,
    List<Guid> CampaignIds);

public record CompanyDto(
    Guid Id,
    string Domain,
    string Name,
    string? Employees,
    string? Summary,
    string? RecentNews,
    EnrichStatus EnrichStatus,
    DateTimeOffset? ResearchedAt,
    DateTimeOffset? EnrichedAt,
    List<string> GenericEmails,
    List<LeadPersonDto> People);

public record ImportPersonInput(
    string Domain,
    string? CompanyName,
    string FirstName,
    string LastName,
    string? Title,
    string Email,
    string? Phone,
    string? City,
    string? LinkedinUrl);
