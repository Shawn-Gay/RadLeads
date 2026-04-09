namespace RadLeads.Api.Models;

public class CallLog : BaseEntity
{
    public string CalledPhone { get; set; } = string.Empty;
    public CallOutcome Outcome { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CalledAt { get; set; } = DateTimeOffset.UtcNow;

    // Twilio stubs — null until integrated
    public int? DurationSeconds { get; set; }
    public string? RecordingUrl { get; set; }

    public LeadPerson? Person { get; set; }
    public Company? Company { get; set; }
}
