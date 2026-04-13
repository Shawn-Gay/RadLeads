namespace RadLeads.Api.Models;

public enum EnrichStatus
{
    NotEnriched,
    Researching,
    Researched,
    Enriching,
    Enriched,
    ResearchFailed,
    Unreachable,
    [Obsolete("Serper removed. Legacy DB values only.")]
    SerperFailed,
}
