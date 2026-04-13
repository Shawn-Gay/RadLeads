# Wiki Log

Append-only. Format: `## [DATE] type | title`
Types: `init | ingest | feature | query | lint | update`

---

## [2026-04-12] init | Bootstrap wiki from codebase

Bootstrapped wiki from live code reading. Pages created:
- `architecture.md` — full stack + job schedule
- `domain-model.md` — all entities, relationships, DB conventions
- `backend.md` — controllers, services, jobs
- `frontend.md` — pages, AppContext, services
- `enrichment-pipeline.md` — research/enrich flow
- `email-system.md` — campaigns, warmup, dispatch, inbox
- `dialer.md` — call panel, call logs, follow-up emails

Sources read: `Company.cs`, `AppDbContext.cs`, `Program.cs`, `IScrapingService.cs`, `AppContext.tsx`, `types/index.ts`

## [2026-04-12] feature | Dialer assignment system

New: multi-dialer soft-lock via company assignment.

- `Dialer` entity added (`api/Models/Dialer/Dialer.cs`)
- `Company` gained `AssignedTo`, `AssignedAt`, `DialDisposition` fields
- `DialDisposition` enum: `None | NotInterested | BadNumber | Converted`
- `DialersController` — `GET/POST /api/dialers`
- `CompaniesController` — `POST /api/companies/assign`, `PATCH /api/companies/{id}/drop`
- Frontend: `DialerIdentityModal`, `AssignLeadsModal`, full-page `DialerPanel` takeover
- Identity persisted to `localStorage`; dialer queue filtered by `assignedToId + dialDisposition = None`
- Migration: `AddDialerAssignment` (schema) + `FixDialDispositionDefault` (data fix)

## [2026-04-12] feature | Unreachable enrichment status

- `EnrichStatus.Unreachable` set when scraping fails ≥ `MaxScrapeFailures` times
- `ScrapeFailCount` field on `CompanyResearch` tracks consecutive failures
- Frontend: `unreachable` added to `EnrichStatus` type, `enrichStatusMap`, `ENRICH_CONFIG`

## [2026-04-12] update | Wiki sync for dialer + enrichment changes

Updated pages: `dialer.md` (full rewrite), `domain-model.md` (Dialer entity, Company assignment fields), `enrichment-pipeline.md` (Unreachable status + ScrapeFailCount), `backend.md` (DialersController), `frontend.md` (dialer state slices, new components, services)
