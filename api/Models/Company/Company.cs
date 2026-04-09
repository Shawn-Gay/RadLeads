namespace RadLeads.Api.Models;

public class Company : BaseEntity
{
    public string Domain { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Employees { get; set; }
    public string? Summary { get; set; }
    public string? RecentNews { get; set; }
    public string? Phone { get; set; }
    public EnrichStatus EnrichStatus { get; set; } = EnrichStatus.NotEnriched;
    public DateTimeOffset? ResearchedAt { get; set; }
    public DateTimeOffset? EnrichedAt { get; set; }

    public List<LeadPerson> People { get; set; } = [];
    public List<CompanyGenericEmail> GenericEmails { get; set; } = [];
    public CompanyResearch? Research { get; set; }
}
