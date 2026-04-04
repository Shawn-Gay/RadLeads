namespace RadLeads.Api.Models;

public class CampaignStep : BaseEntity
{
    public int Day { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public Campaign Campaign { get; set; } = null!;
}
