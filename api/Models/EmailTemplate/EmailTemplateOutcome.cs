namespace RadLeads.Api.Models;

public class EmailTemplateOutcome : BaseEntity
{
    public CallOutcome Outcome { get; set; }
    public bool IsDefault { get; set; }

    public EmailTemplate Template { get; set; } = null!;
}
