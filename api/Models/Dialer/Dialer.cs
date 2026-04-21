namespace RadLeads.Api.Models;

public class Dialer : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public bool IsDisabled { get; set; }

    public List<Company> AssignedCompanies { get; set; } = [];

    public Script? SelectedScript { get; set; }
}
