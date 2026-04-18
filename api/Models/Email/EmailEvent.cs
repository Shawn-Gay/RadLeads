namespace RadLeads.Api.Models;

public class EmailEvent : BaseEntity
{
    public Guid OutboundEmailId { get; set; }
    public OutboundEmail OutboundEmail { get; set; } = null!;

    public EmailEventType EventType { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;

    public string? ClickedUrl { get; set; }
    public string? UserAgent { get; set; }
}
