namespace RadLeads.Api.Models;

public class LeadEmail : BaseEntity
{
    public string Address { get; set; } = string.Empty;
    public EmailSource Source { get; set; } = EmailSource.Guessed;
    public bool IsPrimary { get; set; }
    public EmailStatus Status { get; set; } = EmailStatus.Unknown;

    public LeadPerson Person { get; set; } = null!;
}
