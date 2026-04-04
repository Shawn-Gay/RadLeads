namespace RadLeads.Api.Models;

public class EmailAccount : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public AccountProvider Provider { get; set; } = AccountProvider.Smtp;
    public AccountStatus Status { get; set; } = AccountStatus.Warming;
    public int? Health { get; set; }
    public int DailyLimit { get; set; } = 50;
    public int? WarmupDay { get; set; }
    public int WarmupTotalDays { get; set; } = 30;

    // Connection credentials
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 465;
    public string ImapHost { get; set; } = string.Empty;
    public int ImapPort { get; set; } = 993;
    public string EncryptedPassword { get; set; } = string.Empty;

    public List<Campaign> Campaigns { get; set; } = [];
    public List<WarmupActivity> WarmupActivities { get; set; } = [];
}
