# RadLeads API — System Overview

## What This Is

A .NET 9 ASP.NET Core API that powers the RadLeads outbound sales platform. It manages:

- **Lead enrichment** — crawling company websites and summarizing them with AI
- **Email warmup** — gradually ramping new email accounts to build sender reputation
- **Campaign dispatch** — scheduling and sending multi-step outbound email sequences
- **Email tracking** — open and click tracking via pixels and redirect links

All long-running work is handled by **Quartz.NET background jobs**. The frontend never waits on expensive operations — it queues work, and jobs pick it up asynchronously.

---

## Architecture at a Glance

```
Frontend (React)
     │
     ▼
REST Controllers  ──▶  Services  ──▶  External (SMTP, OpenAI, Web)
                             │
                        Quartz Jobs  ──▶  Database (PostgreSQL via EF Core)
```

---

## Lead Enrichment Pipeline

This is the most complex subsystem. It turns a raw company domain into rich AI-extracted intelligence.

### Status Flow

```
NotEnriched  ──[user queues]──▶  Researching  ──[ScrapeLeadsJob]──▶  Researched
                                                                           │
                                                                    [user queues]
                                                                           ▼
                                                      Enriched  ◀──[SummarizeLeadsJob]──  Enriching
                                                                     (or Failed)
```

The UI triggers the two manual transitions via PATCH endpoints. Background jobs handle everything else.

### Step 1 — Research (Web Crawling)

**Trigger:** `PATCH /api/companies/queue-research` — sets selected `NotEnriched` companies to `Researching`.

**Job:** `ScrapeLeadsJob` — runs every **2 minutes**, processes **20 companies per tick**.

**Service:** `WebCrawlerService` implements `IScrapingService`.

The crawler uses a three-tier URL discovery strategy — same logic as the JS frontend constants:

| Priority | Strategy | Description |
|----------|----------|-------------|
| 1 | **Sitemap** | Fetches `/sitemap.xml`; handles sitemap index by following first child sitemap |
| 2 | **Homepage spider** | AngleSharp parses `<a href>` links; filters by keyword pattern |
| 3 | **Fallback paths** | Tries 19 known paths: `/about`, `/team`, `/services`, `/blog`, etc. |

**URL filtering:** Only same-domain URLs matching the keyword regex are kept:
```
about|contact|team|leadership|service|solution|pricing|news|press|blog|career|company|location|office|faq|invest|partner
```

**Meeting link detection:** Scans page HTML for booking tool patterns:
```
calendly.com|hubspot.com/meetings|tidycal.com|savvycal.com|wa.me
```

**Limits:** `MAX_PAGES=10`, `PAGE_DELAY=300ms`, `TIMEOUT=10s` per page.

**Output stored in `CompanyResearch`:**
- `RawText` — all page text combined, stripped of nav/footer/scripts
- `MeetingLink` — first booking URL found (if any)
- `PagesCrawledJson` — JSON array of `{label, url}` for each page crawled
- `ScrapedAt` — timestamp

### Step 2 — Enrichment (AI Summarization)

**Trigger:** `PATCH /api/companies/queue-enrich` — sets selected `Researched` companies to `Enriching`.

**Job:** `SummarizeLeadsJob` — runs every **5 minutes**, processes **10 companies per tick**.

**Service:** `OpenAiService` implements `IAiService`.

Sends up to **14,000 chars** of crawled text to GPT-4o-mini (configurable) and extracts:

```json
{
  "summary": "2-3 sentence company description",
  "recentNews": "Funding rounds, product launches, announcements",
  "painPoints": ["pain point 1", "pain point 2"],
  "keyPeople": [{ "name": "Full Name", "title": "Job Title" }],
  "recentEvents": ["event 1", "event 2"]
}
```

**Output promoted onto `Company`:**
- `Company.Summary` — top-level, available for email template tokens
- `Company.RecentNews` — top-level, same

**Full result stored in `CompanyResearch.SummaryJson`** — raw JSON for future use (pain points, key people in personalized templates).

### Data Model

```
Company (1) ──────────── (1) CompanyResearch
  │ Domain, Name                RawText
  │ Summary, RecentNews         MeetingLink
  │ EnrichStatus                PagesCrawledJson
  │ ResearchedAt                SummaryJson
  └ EnrichedAt                  ScrapedAt / SummarizedAt
```

`CompanyResearch` uses a **shadow foreign key** (`CompanyId`) — no scalar FK property on the model per coding standards.

---

## Email Warmup System

Gradually builds sender reputation for new email accounts by sending realistic-looking warmup emails between accounts.

### Components

| Component | Role |
|-----------|------|
| `WarmupScheduleJob` | Runs daily at **8:00 AM UTC**. Calculates today's send volume per account, writes `OutboundEmail` records spread evenly across 8 AM–8 PM. Advances `WarmupDay` counter. |
| `WarmupEngageJob` | Runs **every hour**. Simulates engagement: opens, replies, moves from spam — builds reputation signals. |
| `WarmupService` | Business logic for ramp schedules, health scoring, pairing accounts for warmup sends. |
| `EmailConnectionService` | Manages live IMAP/SMTP connections (pooled, singleton). |
| `EncryptionService` | AES encryption/decryption for stored email passwords. |

### Account Status Flow

```
Inactive ──▶ Warming ──▶ Active ──▶ Paused
```

---

## Campaign Dispatch System

Sends multi-step outbound email sequences to enrolled leads.

### Components

| Component | Role |
|-----------|------|
| `CampaignScheduleJob` | Runs daily at **8:05 AM UTC** (after warmup). Determines which step each enrolled person is due for today; writes `OutboundEmail` + `CampaignSend` records. |
| `EmailDispatchJob` | Runs **every 5 minutes**. Picks up to 100 pending `OutboundEmail` records, respects per-account `DailyLimit`, sends via SMTP, records `MessageId`. |
| `CampaignDispatchService` | Core scheduling logic: step sequencing, delay calculation, sender rotation across `Campaign.Senders`. |
| `TrackingController` | Handles open tracking pixels (`GET /track/{token}/open`) and click redirects (`GET /track/{token}/click`). |

### Data Flow

```
Campaign + Steps + Enrolled People
         │
         ▼ (CampaignScheduleJob @ 8:05 AM)
    CampaignSend + OutboundEmail (Pending)
         │
         ▼ (EmailDispatchJob every 5 min)
    OutboundEmail (Sent) + MessageId recorded
         │
         ▼ (TrackingController on open/click)
    CampaignSend.OpenedAt / ClickedAt updated
```

---

## Background Jobs Summary

| Job | Schedule | Batch | Purpose |
|-----|----------|-------|---------|
| `ScrapeLeadsJob` | Every 2 min | 20 | Crawl company websites → `CompanyResearch.RawText` |
| `SummarizeLeadsJob` | Every 5 min | 10 | AI summarize scraped text → `Company.Summary` |
| `WarmupScheduleJob` | Daily 8:00 AM UTC | All active accounts | Plan today's warmup sends |
| `WarmupEngageJob` | Every 1 hour | — | Simulate email engagement for reputation |
| `CampaignScheduleJob` | Daily 8:05 AM UTC | All active campaigns | Plan today's campaign sends |
| `EmailDispatchJob` | Every 5 min | 100 | Actually send queued emails via SMTP |

---

## Configuration

| Key | Description |
|-----|-------------|
| `ConnectionStrings:Default` | PostgreSQL connection string |
| `OpenAI:ApiKey` | API key for GPT summarization |
| `OpenAI:Model` | Model to use (default: `gpt-4o-mini`) |
| `AllowedOrigins` | CORS origins array (default: `http://localhost:5173`) |

---

## Key Services

| Interface | Implementation | Lifetime |
|-----------|---------------|---------|
| `IScrapingService` | `WebCrawlerService` | Singleton |
| `IAiService` | `OpenAiService` | Singleton |
| `IEmailSendService` | `MailKitEmailSendService` | Scoped |
| `IWarmupService` | `WarmupService` | Scoped |
| `ICampaignDispatchService` | `CampaignDispatchService` | Scoped |
| `EncryptionService` | — | Singleton |
| `EmailConnectionService` | — | Singleton |

Named `HttpClient("scraper")` — custom User-Agent, 15s timeout — used exclusively by `WebCrawlerService`.

---

## REST API Endpoints (high-level)

| Controller | Base Route | Notable Endpoints |
|------------|-----------|------------------|
| `CompaniesController` | `/api/companies` | `PATCH queue-research`, `PATCH queue-enrich` |
| `CampaignsController` | `/api/campaigns` | CRUD + step management |
| `EmailAccountsController` | `/api/emailaccounts` | CRUD + status management |
| `WarmupController` | `/api/warmup` | Stats, pause/resume |
| `TrackingController` | `/track` | Open pixel, click redirect |
