# Domain Model

> 3-tier hierarchy: Company (domain anchor) → LeadPerson → LeadEmail.

## Tier 1 — Company

Primary key: `Guid Id` (inherited from `BaseEntity`)  
Domain anchor: `string Domain` — every company is keyed by domain.

| Field | Type | Notes |
|-------|------|-------|
| `Domain` | string | unique anchor, used for dedup on import |
| `Name` | string | display name |
| `Employees` | string? | headcount range, free text |
| `Summary` | string? | AI-generated company blurb |
| `RecentNews` | string? | AI-extracted news snippets |
| `Phone` | string? | scraped from website |
| `Email` | string? | scraped generic contact email |
| `EnrichStatus` | enum | see [[enrichment-pipeline]] |
| `ResearchedAt` | DateTimeOffset? | timestamp of last research pass |
| `EnrichedAt` | DateTimeOffset? | timestamp of last enrich pass |
| `Research` | CompanyResearch? | 1:1 nav, holds raw AI output |
| `AssignedTo` | `Dialer?` | nav — shadow FK `AssignedToId`; null = unassigned (in pool) |
| `AssignedAt` | DateTimeOffset? | when dialer claimed this company |
| `DialDisposition` | DialDisposition | `None \| NotInterested \| BadNumber \| Converted` — `None` = in pool |
| `People` | List\<LeadPerson\> | 1:many nav |

**Frontend type**: `src/types/index.ts → Company`  
Extra frontend fields: `meetingLink`, `pagesCrawledCount` (computed/returned by API, not stored directly on the entity).

## Tier 2 — LeadPerson

Belongs to one Company.

| Field | Type | Notes |
|-------|------|-------|
| `FirstName/LastName` | string | |
| `Title` | string | job title |
| `LinkedinUrl` | string? | |
| `Phone` | string? | direct line |
| `City` | string? | |
| `Icebreaker` | string? | AI-generated opening line |
| `PainPoint` | string? | AI-inferred pain point |
| `SourcePage` | string? | URL where person was found |
| `FollowUpEmailTemplate` | string? | |
| `Campaigns` | List\<Campaign\> | implicit M2M via join table |
| `CallLogs` | List\<CallLog\> | 1:many |
| `Emails` | List\<LeadEmail\> | 1:many |

## Tier 3 — LeadEmail

| Field | Type | Notes |
|-------|------|-------|
| `Address` | string | email address |
| `Source` | EmailSource enum | `csv \| guessed \| scraped \| api` |
| `IsPrimary` | bool | |
| `Status` | EmailStatus enum | `verified \| bounced \| unknown` |

## Other entities

### Campaign
- M2M with `LeadPerson` (enrolled leads)
- M2M with `EmailAccount` (senders)
- Has `List<CampaignStep>` (sequence steps, each with `Day`, `Subject`, `Body`)
- Has `List<CampaignSend>` (per-send tracking records with unique `Token`)

### EmailAccount
Sender identity. Fields: `Email`, `Provider` (`namecheap|google|smtp`), `Status` (`active|warming|paused|inactive`), `DailyLimit`, `SentToday`, warmup counters.  
Sender persona fields: `FirstName`, `LastName`, `Title`, `CompanyName`, `Phone`, `CalendarLink`, `Signature` — used for token replacement in email templates.

### CallLog
Polymorphic: optional `PersonId` + optional `CompanyId` (at least one set).  
`Outcome` enum: `Connected | LeftVoicemail | LeftMessage | NoAnswer | WrongNumber | CallBack | NotInterested | Interested`

### Dialer
Represents a person who makes calls. Fields: `Name`.  
1:many with `Company` via `AssignedTo` nav / shadow FK `AssignedToId`.  
See [[dialer]] for full assignment flow.

### OutboundEmail
Tracks emails queued/sent outside of campaign dispatch (e.g. dialer follow-ups).  
Optional `PersonId` + `CompanyId` link (set for follow-ups).

### CompanyResearch
1:1 with Company. Stores raw AI research output (separate table so Company stays lean).

### WarmupActivity
Records each warmup action: `partnerEmail`, `action` (WarmupAction enum), `timestamp`.

### InboxReply
Incoming reply tracking.

## DB conventions
- All enums stored as strings (readable, not ints) — configured in `AppDbContext.ConfigureConventions`
- `BaseEntity`: `Guid Id`, `DateTimeOffset CreatedAt`, `DateTimeOffset UpdatedAt`
- `UpdatedAt` auto-set on every `SaveChangesAsync` via change-tracker loop
- Implicit M2M (EF Core join tables, no explicit join entity)

## Related
- [[enrichment-pipeline]] — how EnrichStatus transitions
- [[email-system]] — Campaign/EmailAccount usage
- [[dialer]] — CallLog creation
- [[backend]] — EF Core setup, migrations
