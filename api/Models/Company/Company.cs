namespace RadLeads.Api.Models;

public class Company : BaseEntity
{
    public string Domain { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Employees { get; set; }
    public string? Summary { get; set; }
    public string? RecentNews { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public EnrichStatus EnrichStatus { get; set; } = EnrichStatus.NotEnriched;
    public DateTimeOffset? ResearchedAt { get; set; }
    public DateTimeOffset? EnrichedAt { get; set; }

    public Dialer? AssignedTo { get; set; }
    public DateTimeOffset? AssignedAt { get; set; }
    public DialDisposition DialDisposition { get; set; } = DialDisposition.None;

    // Cadence: drives the dialer queue (Day-0 through Day-30 touch sequence)
    public CadenceStatus CadenceStatus { get; set; } = CadenceStatus.NotStarted;
    public DateTimeOffset? CadenceStartedAt { get; set; }
    public int CurrentTouchNumber { get; set; }
    public DateTimeOffset? NextTouchAt { get; set; }

    public List<LeadPerson> People { get; set; } = [];
    public CompanyResearch? Research { get; set; }
}
