namespace RadLeads.Api.Models;

public class Script : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsArchived { get; set; }

    public List<ScriptFeedback> Feedback { get; set; } = [];
    public List<CallLog> CallLogs { get; set; } = [];
}
