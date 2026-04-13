# Backend

> .NET 9 Web API — controllers, services, jobs, DB layer.

## Controllers

| File | Routes | Notes |
|------|--------|-------|
| `CompaniesController` | `/api/companies` | CRUD + import + research/enrich queue + assign/drop leads |
| `DialersController` | `/api/dialers` | List dialers, create dialer |
| `EmailAccountsController` | `/api/email-accounts` | CRUD, status patch, sender persona patch |
| `CampaignsController` | `/api/campaigns` | CRUD, enroll/unenroll people |
| `CallLogsController` | `/api/call-logs` | Create/list call logs |
| `FollowUpEmailsController` | `/api/follow-up-emails` | Queue follow-up emails from dialer |
| `InboxController` | `/api/inbox` | Read inbox replies, mark read |
| `WarmupController` | `/api/warmup` | Warmup activity feed |
| `AiController` | `/api/ai` | Direct AI utility endpoints |
| `AdminController` | `/api/admin` | Admin/debug ops |
| `TrackingController` | `/api/tracking` | Open/click pixel tracking |
| `WebhooksController` | `/api/webhooks` | Inbound webhook handlers |

## Services

| Service | Type | Purpose |
|---------|------|---------|
| `IScrapingService` / `PlaywrightScraperService` | Scoped | Headless browser crawl — returns `CrawlResult` with pages, phone, email, meetingLink |
| `WebCrawlerService` | Scoped | HTTP-based crawler (lighter than Playwright) |
| `IEmailSendService` / `MailKitEmailSendService` | Scoped | Send via SMTP using MailKit |
| `BrevoEmailSendService` | Scoped | Send via Brevo API |
| `IWarmupService` / `WarmupService` | Scoped | Warmup logic — pairs accounts, schedules sends |
| `ICampaignDispatchService` / `CampaignDispatchService` | Scoped | Dequeue and send campaign emails |
| `EmailConnectionService` | Singleton | Manages IMAP/SMTP connection pool |
| `EncryptionService` | Singleton | Encrypt/decrypt SMTP credentials at rest |

## Scraping internals

`IScrapingService.CrawlAsync(domain)` returns:
```csharp
record CrawlResult(string Domain, List<CrawledPage> Pages, string? MeetingLink, string? Phone, string? Email)
```
`CombinedText` caps each page at 5,000 chars → max ~75,000 chars total before AI call.

## Jobs (Quartz.NET)

See [[architecture]] for schedule. Key jobs:

- **`EmailDispatchJob`** — runs `ICampaignDispatchService` every 5 min
- **`WarmupScheduleJob`** — calls `IWarmupService` to plan warmup pairs each morning
- **`WarmupEngageJob`** — processes pending warmup actions hourly
- **`CampaignScheduleJob`** — queues that day's campaign sends (runs after warmup)
- **`ScrapeLeadsJob`** — bulk research/enrich trigger

## Database

- PostgreSQL via Npgsql + EF Core
- `AppDbContext` — one DbSet per entity
- Migrations in `api/Migrations/`
- Auto-migrate on startup (`Database.Migrate()`)
- Enums stored as strings (see [[domain-model]])
- `UpdatedAt` auto-set via change tracker

## DTOs

Located in `api/Dtos/`. Key files:
- `CompanyDtos.cs` — import, research, enrich payloads
- `EmailAccountDtos.cs` — create/connect payloads
- `FollowUpEmailDtos.cs` — follow-up email queue payload

## Config keys

- `ConnectionStrings:Default` — PostgreSQL connection string
- `AllowedOrigins` — CORS whitelist (default: `http://localhost:5173`)

## Related
- [[domain-model]] — entity definitions
- [[enrichment-pipeline]] — research/enrich controller flow
- [[email-system]] — campaign/warmup service detail
- [[dialer]] — call log + follow-up email endpoints
