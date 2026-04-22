namespace RadLeads.Api.Models;

public class LeadPerson : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? SourcePage { get; set; }
    public string? LinkedinUrl { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Icebreaker { get; set; }
    public string? PainPoint { get; set; }
    public PersonSource Source { get; set; } = PersonSource.ScrapedSite;

    public Company Company { get; set; } = null!;
    public List<LeadEmail> Emails { get; set; } = [];
    public List<Campaign> Campaigns { get; set; } = [];
    public List<CallLog> CallLogs { get; set; } = [];
}
