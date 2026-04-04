namespace RadLeads.Api.Models;

public class Campaign : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public CampaignStatus Status { get; set; } = CampaignStatus.Draft;
    public int Sent { get; set; }
    public int Opens { get; set; }
    public int Replies { get; set; }

    public List<CampaignStep> Steps { get; set; } = [];
    public List<LeadPerson> People { get; set; } = [];
    public List<EmailAccount> Senders { get; set; } = [];
}
