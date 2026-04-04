namespace RadLeads.Api.Models;

public class InboxReply : BaseEntity
{
    public string FromAddress { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset ReceivedAt { get; set; }
    public bool Read { get; set; }

    public CampaignSend Send { get; set; } = null!;
}
