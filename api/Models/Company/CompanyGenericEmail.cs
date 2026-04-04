namespace RadLeads.Api.Models;

public class CompanyGenericEmail : BaseEntity
{
    public string Email { get; set; } = string.Empty;

    public Company Company { get; set; } = null!;
}
