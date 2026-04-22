namespace RadLeads.Api.Models;

public class CallSession : BaseEntity
{
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EndedAt { get; set; }
    public int LeadsCalledCount { get; set; }
    public int TotalPausedSeconds { get; set; }

    public Dialer? Dialer { get; set; }
    public ICollection<CallLog> CallLogs { get; set; } = [];
}
