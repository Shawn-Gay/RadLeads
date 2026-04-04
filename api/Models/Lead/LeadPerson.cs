namespace RadLeads.Api.Models;

public class LeadPerson : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? LinkedinUrl { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Icebreaker { get; set; }
    public string? PainPoint { get; set; }

    public Company Company { get; set; } = null!;
    public List<LeadEmail> Emails { get; set; } = [];
    public List<Campaign> Campaigns { get; set; } = [];
}
