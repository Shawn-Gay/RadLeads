namespace RadLeads.Api.Models;

public class ScriptFeedback : BaseEntity
{
    public string Note { get; set; } = string.Empty;
    public string? BodySnapshot { get; set; }

    public Script Script { get; set; } = null!;
    public CallLog? CallLog { get; set; }
    public Dialer? Dialer { get; set; }
}
