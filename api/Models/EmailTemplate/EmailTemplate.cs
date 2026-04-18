namespace RadLeads.Api.Models;

public class EmailTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsArchived { get; set; }

    public List<EmailTemplateOutcome> OutcomeAssignments { get; set; } = [];
    public List<OutboundEmail> OutboundEmails { get; set; } = [];
}
