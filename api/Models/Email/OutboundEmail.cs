namespace RadLeads.Api.Models;

public class OutboundEmail : BaseEntity
{
    public string ToAddress { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;        // HTML
    public OutboundEmailStatus Status { get; set; } = OutboundEmailStatus.Pending;
    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset? ScheduledFor { get; set; }       // null = send ASAP
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }

    public Guid EmailAccountId { get; set; }
    public EmailAccount EmailAccount { get; set; } = null!;

    /// <summary>SMTP Message-ID stored after delivery — used for reply/bounce matching via IMAP.</summary>
    public string? MessageId { get; set; }

    public Guid? CampaignId { get; set; }
    public Campaign? Campaign { get; set; }

    /// <summary>Set when this email was queued by the campaign scheduler.</summary>
    public CampaignSend? CampaignSend { get; set; }

    /// <summary>Set when this email was queued from the dialer follow-up flow.</summary>
    public Company? Company { get; set; }
    public LeadPerson? Person { get; set; }

    /// <summary>Template this email was sent from (for per-template analytics).</summary>
    public EmailTemplate? EmailTemplate { get; set; }
}
