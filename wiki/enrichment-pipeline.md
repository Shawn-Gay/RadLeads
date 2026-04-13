# Enrichment Pipeline

> Two-phase flow: Research (crawl + AI summary) → Enrich (people enrichment + icebreakers).

## Status lifecycle

```
not_enriched → researching → researched → enriching → enriched
                   ↓
            research_failed   (AI summary failed)
                   ↓ (after N scrape failures)
             unreachable      (site not crawlable — permanently skipped)
```

Stored as `EnrichStatus` enum on `Company` (string in DB).

## Phase 1 — Research

**Trigger**: user selects companies → clicks "Research" → `queueResearch(ids)` in frontend → `POST /api/companies/research`

**Backend flow**:
1. Set `EnrichStatus = Researching` on selected companies
2. `ScrapeLeadsJob` (or inline service) calls `IScrapingService.CrawlAsync(domain)`
3. Playwright opens domain, crawls key pages (Home, About, Team, Contact, etc.)
4. Max 15 pages × 5,000 chars each → ~75,000 chars combined
5. AI call with combined text → returns `Summary`, `RecentNews`, `Phone`, `Email`, `MeetingLink`
6. Persist to `Company` + `CompanyResearch`
7. Set `EnrichStatus = Researched`, `ResearchedAt = now`

**Scraping output** (`CrawlResult`):
- `Pages: List<CrawledPage>` — url, label, text
- `MeetingLink` — calendar booking URL if found
- `Phone` — company phone
- `Email` — generic contact email

## Phase 2 — Enrich

**Trigger**: user selects researched companies → "Enrich" → `queueEnrich(ids)` → `POST /api/companies/enrich`

**Backend flow**:
1. Set `EnrichStatus = Enriching`
2. For each `LeadPerson` in company:
   - AI call using company research + person's title/name
   - Generate `Icebreaker`, `PainPoint`, `FollowUpEmailTemplate`
3. Set `EnrichStatus = Enriched`, `EnrichedAt = now`

## Frontend optimistic updates

```ts
// Research queue
setCompanies(prev => prev.map(o =>
  ids.includes(o.id) && o.enrichStatus === 'not_enriched'
    ? { ...o, enrichStatus: 'researching' } : o
))

// Enrich queue
setCompanies(prev => prev.map(o =>
  ids.includes(o.id) && o.enrichStatus === 'researched'
    ? { ...o, enrichStatus: 'enriching' } : o
))
```

Guard: only transitions `not_enriched → researching` and `researched → enriching` (prevents re-queuing).

## `ScrapeLeadsJob`

Quartz job (`api/Jobs/ScrapeLeadsJob.cs`) — processes the research/enrich queue in bulk. Works through companies with `EnrichStatus = Researching` or `Enriching`.

If Playwright cannot crawl a site, `ScrapeFailCount` (on `CompanyResearch`) increments. After `MaxScrapeFailures` consecutive failures the company is set to `Unreachable` and skipped by future jobs. User can manually retry from the Stage badge in the leads table.

## Related
- [[domain-model]] — EnrichStatus field, Company/CompanyResearch entities
- [[backend]] — IScrapingService, CrawlResult, controllers
- [[frontend]] — queueResearchCompanies, queueEnrichCompanies in AppContext
