namespace RadLeads.Api.Models;

public class CampaignSend : BaseEntity
{
    /// <summary>Unique token used in tracking pixel and click-redirect URLs.</summary>
    public Guid Token { get; set; } = Guid.NewGuid();

    /// <summary>SMTP Message-ID stored after actual delivery — used to match IMAP replies/bounces.</summary>
    public string? MessageId { get; set; }

    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset? OpenedAt { get; set; }
    public DateTimeOffset? ClickedAt { get; set; }
    public DateTimeOffset? RepliedAt { get; set; }
    public DateTimeOffset? BouncedAt { get; set; }

    public Campaign Campaign { get; set; } = null!;
    public CampaignStep Step { get; set; } = null!;
    public LeadPerson Person { get; set; } = null!;
    public EmailAccount Account { get; set; } = null!;
}
