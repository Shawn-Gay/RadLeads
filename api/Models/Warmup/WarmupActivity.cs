namespace RadLeads.Api.Models;

public class WarmupActivity : BaseEntity
{
    public string PartnerEmail { get; set; } = string.Empty;
    public WarmupAction Action { get; set; }

    public EmailAccount Account { get; set; } = null!;
}
