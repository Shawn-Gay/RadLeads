# Dialer

> Full-page call panel at `/dialer` — multi-dialer assignment, scripts, call logging, follow-up emails.

## Identity & Assignment Flow

Multiple people can use the dialer simultaneously without calling the same lead.

**Flow:**
1. Click "Start Dialer" in LeadsPage toolbar
2. If no identity set → **DialerIdentityModal** — pick existing dialer or create new one (disabled dialers hidden)
3. If identity set but queue empty → **AssignLeadsModal** — choose how many leads to pull (slider 1–50, cap 50 per dialer)
4. Backend assigns top-N unassigned companies (Enriched > Researched > other, then oldest first)
5. Router navigates to `/dialer` — full-page `DialerPage` replaces LeadsPage content

Identity persisted to `localStorage` key `radleads:currentDialerId`. Restored on next visit — but ignored if the saved dialer is now disabled.

## Dialer Entity

`api/Models/Dialer/Dialer.cs`

| Field | Notes |
|-------|-------|
| `Name` | display name (e.g. "Shawn") |
| `IsDisabled` | bool — disabled dialers stay in call history but can't be selected/assigned |
| `AssignedCompanies` | nav — companies currently assigned to this dialer |
| `SelectedScript` | nav — which script this dialer is currently using (nullable) |

**Deletion policy**: Dialers cannot be deleted — only disabled. This preserves historical attribution on `CallLog.Dialer`. The old `DELETE` endpoint has been removed.

**API** (`DialersController`):
- `GET /api/dialers` — returns `{ id, name, isDisabled, selectedScriptId }`
- `POST /api/dialers` — create
- `PATCH /api/dialers/{id}/disabled` — body `{ isDisabled: bool }` — toggles enable/disable
- `POST /api/dialers/{id}/selected-script` — body `{ scriptId: Guid? }` — sets which script the dialer uses

## Lead Assignment

Company gains three fields for dialer assignment:

| Field | Type | Notes |
|-------|------|-------|
| `AssignedTo` | `Dialer?` | shadow FK `AssignedToId` |
| `AssignedAt` | `DateTimeOffset?` | when assigned |
| `DialDisposition` | `DialDisposition` enum | `None \| NotInterested \| BadNumber \| Converted` |

**Pool** = `AssignedTo IS NULL AND DialDisposition = None`

**Assign endpoint**: `POST /api/companies/assign` (`{ dialerId, count }`) — assigns top-N pool companies to the dialer, returns updated DTOs.

**Drop endpoint**: `PATCH /api/companies/{id}/drop` (`{ disposition }`)
- `None` (Return to pool) → clears `AssignedTo`, keeps `DialDisposition = None`
- Any other value → permanently removes from pool

Cap: 50 assigned leads per dialer (enforced server-side).

## DialerPage UI

`src/pages/DialerPage/DialerPage.tsx` — full-page at `/dialer`.

Layout:

```
┌─── DialerHeader ─────────────────────────────────────┐
│ Back • Score • Attempt • Dialer • Prev N/M Next Cold │
├──────────────┬───────────────────────────────────────┤
│ QueueSidebar │ Main (2-col grid)                     │
│ (w-64)       │ ┌──────────────┬──────────────────┐   │
│  [1] Co A    │ │ Company card │ ScriptCard       │   │
│  [2] Co B ←  │ │ Decision Mkr │ ObjectionPlaybook│   │
│  [3] Co C    │ │ OutcomeSectn │                  │   │
│  ...         │ │ CallHistory  │                  │   │
│              │ │ EmailHistory │                  │   │
│              │ └──────────────┴──────────────────┘   │
└──────────────┴───────────────────────────────────────┘
```

Subcomponents (all in `src/pages/DialerPage/`):
- `DialerHeader.tsx` — Back, Prev/Next, position, Next Cold, Assign More, Drop menu, dialer name switch
- `QueueSidebar.tsx` — left rail listing every company in `dialerQueue`; shows name/domain, score badge, attempt count or ❄ cold marker, latest outcome, callback flame; current row highlighted; click to jump (`dialerJumpTo`); auto-scrolls active into view
- `CallHistoryCard.tsx` — recent call logs for current company; each row shows outcome pill, phone, date, **dialer name** (user icon + blue text), notes
- `EmailHistoryCard.tsx` — follow-up emails sent to this company
- `ScriptCard.tsx` — script picker + filled-token preview + inline editor + flag-issue modal (`postScriptFeedback`)
- `ObjectionPlaybook.tsx` — canned rebuttals
- `OutcomeSection.tsx` — outcome picker, notes, callback datetime, follow-up email composer
- `DropMenu.tsx` — Return to Pool / Not Interested / Bad Number / Converted
- `ResearchChip.tsx` — small external-link chips (Maps, LinkedIn, etc.)

### Supporting modals (in LeadsPage)
- `DialerIdentityModal.tsx` — who's dialing picker/creator (filters out `isDisabled` dialers)
- `AssignLeadsModal.tsx` — lead count slider, shows current assigned count

## DialerContext

`src/context/DialerContext.tsx` — separate context from `AppContext`, holds session/queue state.

Exposes:
- `callLogs`, `callLogsByCompany`, `callLogsByPerson`, `attemptsByPerson`, `scoreByCompany`, `refreshCallLogs`
- `dialerMode`, `dialerIndex`, `dialerQueue`, `dialerCompany`, `dialerPersonId`
- `startDialer`, `openDialer`, `dialerPrev`, `dialerNext`, `dialerNextCold`, `dialerJumpTo(index)`, `dialerExit`
- `handleDropCompany`, `handleAssigned`, `handleIdentitySelected`

Queue is "frozen" at session start (`sessionQueueIds`) so re-sort during calls doesn't move the cursor. New assigns during a session are appended.

## Call Logs

### Entity
`CallLog` — polymorphic: optional `PersonId` + optional `CompanyId` (at least one required).

| Field | Notes |
|-------|-------|
| `CalledPhone` | phone number dialed |
| `Outcome` | enum — see below |
| `Notes` | free-text notes |
| `CalledAt` | timestamp |
| `DurationSeconds` | int? — Twilio stub, null until integrated |
| `RecordingUrl` | string? — Twilio stub |
| `Person` | nav (nullable) |
| `Company` | nav (nullable) |
| `Script` | nav (nullable) — which script was selected when call logged |
| `Dialer` | nav (nullable) — who made the call; preserved even if dialer later disabled |

`CallbackAt` lives on the follow-up scheduling logic client-side (stored via callback-outcome UX), not persisted on `CallLog` server-side in the current DTO.

### Outcome enum
`Connected | LeftVoicemail | LeftMessage | NoAnswer | WrongNumber | CallBack | NotInterested | Interested`

### API
`CallLogsController`:
- `POST /api/call-logs` — body includes `dialerId` + `scriptId` for attribution
- `GET /api/call-logs` — all
- `GET /api/call-logs/person/{personId}`
- `GET /api/call-logs/company/{companyId}`

DTO (`CallLogDto`): `id, personId, companyId, calledPhone, outcome, notes, calledAt, scriptId, dialerId`.

### Frontend
`src/services/callLogs.ts` — service functions; maps DTO → `CallLog` type. UI resolves `dialerId → dialer.name` via `AppContext.dialers` lookup.

## Scripts

Scripts are reusable call scripts with token substitution. Each dialer can have one selected.

### Entity
`Script` — `Name`, `Body`, `IsArchived`, `CreatedAt`, `UpdatedAt`, `Feedback[]` (ScriptFeedback).

### ScriptFeedback
Flag-issue reports from dialers on scripts. Fields: `ScriptId` (required), `CallLogId?`, `DialerId?`, `Note`, `BodySnapshot`.

### API
`ScriptsController`:
- `GET /api/scripts`, `POST /api/scripts`, `PUT /api/scripts/{id}`, `DELETE /api/scripts/{id}`
- `PATCH /api/scripts/{id}/archive`
- `POST /api/dialers/{id}/selected-script` — set dialer's current script
- `POST /api/scripts/{id}/feedback`
- `GET /api/scripts/{id}/stats?dialerId=...` — outcome breakdown, per-dialer rollups

### UI
- `ScriptsPage` — manage scripts
- `DialerPage → ScriptCard` — pick, preview (tokens filled), inline-edit, flag issue
- `AnalyticsPage → ScriptsAnalytics` — performance stats, filter by dialer, per-dialer breakdown

## Follow-up Emails

After a call, user can queue a follow-up email from the `OutcomeSection`.

**Entity**: `OutboundEmail` with `PersonId` + `CompanyId` set (links back to the lead), optional `EmailTemplateId`.
**API**: `FollowUpEmailsController` — `POST /api/follow-up-emails`, `GET /api/follow-up-emails/company/{id}`
**DTO**: `api/Dtos/FollowUpEmailDtos.cs`
**Frontend service**: `src/services/followUpEmails.ts`

Email content uses sender persona tokens (from the assigned `EmailAccount`) and lead tokens. Templates are assigned to outcomes via `EmailTemplateOutcome` with `IsDefault` flag — picker auto-selects default template for the logged outcome.

## Dialer queue priority scoring

`src/lib/scoring.ts → scoreCompany(company, callLogs)` — higher score = first in queue.

| Signal | Points |
|--------|--------|
| Company has phone | +20 |
| Has recent news | +20 |
| Has meeting link | +10 |
| Has summary | +5 |
| Person has phone | +15 each |
| Person has icebreaker | +10 each |
| Person has pain point | +10 each |
| Person has verified email | +10 each |
| Fresh lead (0 calls) | +10 |
| Has "Interested" outcome | +50 |
| Has "CallBack" outcome | +30 |
| Has "NotInterested" outcome | −50 |
| Has "WrongNumber" outcome | −20 |

## Related
- [[domain-model]] — Dialer, CallLog, Script, OutboundEmail entities; DialDisposition enum
- [[backend]] — DialersController, CallLogsController, ScriptsController, FollowUpEmailsController
- [[email-system]] — OutboundEmail, EmailTemplate outcome assignments, token replacement
- [[frontend]] — DialerPage, DialerContext, useLeadsPage dialer state
