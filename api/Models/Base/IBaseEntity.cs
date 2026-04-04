namespace RadLeads.Api.Models;

public interface IBaseEntity
{
    Guid Id { get; set; }
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset UpdatedAt { get; set; }
    DateTimeOffset? DeletedAt { get; set; }
}
