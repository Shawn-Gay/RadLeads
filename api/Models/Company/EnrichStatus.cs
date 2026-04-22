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
    FindingDecisionMaker,
    SerperFailed,
}
