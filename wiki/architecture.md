# Architecture

> System overview — tech stack, layers, deployment topology.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, TanStack Query + Table + Router, Tiptap |
| Backend | .NET 9, ASP.NET Core Web API, EF Core + Npgsql |
| DB | PostgreSQL |
| Jobs | Quartz.NET (hosted in API process) |
| Scraping | Playwright (headless browser via `PlaywrightScraperService`) + `WebCrawlerService` |
| Email send | MailKit (`MailKitEmailSendService`), Brevo (`BrevoEmailSendService`) |
| Encryption | `EncryptionService` (singleton) — used for SMTP/IMAP credentials |

## Repository layout

```
RadLeads/
  api/                  ← .NET backend
    Controllers/
    Data/               ← AppDbContext, migrations
    Dtos/
    Jobs/               ← Quartz jobs
    Models/             ← entities by domain folder
    Services/
  src/                  ← React frontend
    components/         ← shared UI components
    context/            ← AppContext (global state)
    lib/                ← utilities (tokens, scoring, etc.)
    pages/              ← page-level components + hooks
    services/           ← API call functions
    types/              ← TypeScript interfaces
  wiki/                 ← this knowledge base
```

## Frontend routing & pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | DashboardPage | Overview |
| `/leads` | LeadsPage | Company/person list, enrichment, dialer |
| `/enrich` | EnrichPage | (merged with leads in practice) |
| `/campaigns` | CampaignsPage | Campaign list |
| `/campaigns/:id` | CampaignEditPage | Edit steps/senders |
| `/accounts` | AccountsPage | Email account management, warmup |
| `/inbox` | InboxPage | Incoming reply reader |
| `/settings` | SettingsPage | App settings |

## Frontend state model

Single `AppContext` (React Context + useState) loaded at app startup. Holds:
- `companies: Company[]` — full lead list (Company → people → emails)
- `campaigns: Campaign[]`
- `accounts: EmailAccount[]`
- `warmupActivities: WarmupActivity[]`
- `inbox: InboxMessage[]`

Data flows: `API → services/*.ts → AppContext → pages`. No data hardcoded in pages.  
See [[frontend]] for details.

## Backend API

RESTful controllers, no versioning. CORS configured per `AllowedOrigins` config key.  
DB migrations auto-applied on startup.  
See [[backend]] for controller/service inventory.

## Scheduled jobs (Quartz.NET)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `EmailDispatchJob` | every 5 min | Send queued campaign emails |
| `WarmupScheduleJob` | 8:00 AM UTC cron | Schedule warmup sends for the day |
| `WarmupEngageJob` | every 1 hr | Process warmup engagement actions |
| `CampaignScheduleJob` | 8:05 AM UTC cron | Queue campaign sends for the day |
| `ScrapeLeadsJob` | (manual trigger) | Bulk scrape/enrich leads |

## Related
- [[backend]] — controllers, services, jobs detail
- [[frontend]] — page components, hooks, context API
- [[domain-model]] — data entities
- [[enrichment-pipeline]] — scraping + AI flow
- [[email-system]] — dispatch + warmup
