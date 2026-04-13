# Dialer

> Full-page call panel — multi-dialer assignment system, call logging, follow-up emails.

## Identity & Assignment Flow

Multiple people can use the dialer simultaneously without calling the same lead.

**Flow:**
1. Click "Start Dialer" in LeadsPage toolbar
2. If no identity set → **DialerIdentityModal** — pick existing dialer or create new one
3. If identity set but queue empty → **AssignLeadsModal** — choose how many leads to pull (slider 1–50, cap 50 per dialer)
4. Backend assigns top-N unassigned companies (Enriched > Researched > other, then oldest first)
5. Full-page **DialerPanel** replaces LeadsPage content

Identity persisted to `localStorage` key `radleads:currentDialerId` — restored on next visit.

## Dialer Entity

`api/Models/Dialer/Dialer.cs`

| Field | Notes |
|-------|-------|
| `Name` | display name (e.g. "Shawn") |
| `AssignedCompanies` | nav — companies currently assigned to this dialer |

**API**: `DialersController` — `GET /api/dialers`, `POST /api/dialers`

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

## DialerPanel UI

`src/pages/LeadsPage/DialerPanel.tsx` — full-page takeover (early return in `LeadsPage.tsx`).

Features:
- Header: progress (`3 / 20`), Prev/Next navigation, "Next Cold" skip, Exit
- "Dialing as: [Name]" badge — click to switch identity
- Company context: summary, recent news, icebreaker, pain point
- Call script with token fill (`{{firstName}}`, `{{company}}`, etc.)
- Outcome picker after call
- Callback scheduling (when outcome = `CallBack`)
- Follow-up email composer with template
- Objection playbook
- Drop menu: Return to Pool / Not Interested / Bad Number / Converted

### Supporting modals
- `DialerIdentityModal.tsx` — who's dialing picker/creator
- `AssignLeadsModal.tsx` — lead count slider, shows current assigned count

## Call Logs

### Entity
`CallLog` — polymorphic: optional `PersonId` + optional `CompanyId` (at least one required).

| Field | Notes |
|-------|-------|
| `CalledPhone` | phone number dialed |
| `Outcome` | enum — see below |
| `Notes` | free-text notes |
| `CalledAt` | timestamp |
| `CallbackAt` | DateTimeOffset? — scheduled callback time |

### Outcome enum
`Connected | LeftVoicemail | LeftMessage | NoAnswer | WrongNumber | CallBack | NotInterested | Interested`

### API
`CallLogsController` — `POST /api/call-logs`, `GET /api/call-logs` (filtered by person or company).

### Frontend
`src/services/callLogs.ts` — service functions.

## Follow-up Emails

After a call, user can queue a follow-up email from the dialer panel.

**Entity**: `OutboundEmail` with `PersonId` + `CompanyId` set (links back to the lead).  
**API**: `FollowUpEmailsController` — `POST /api/follow-up-emails`  
**DTO**: `api/Dtos/FollowUpEmailDtos.cs`  
**Frontend service**: `src/services/followUpEmails.ts`

Email content can use sender persona tokens (from the assigned `EmailAccount`).

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
- [[domain-model]] — Dialer, CallLog, OutboundEmail entities; DialDisposition enum
- [[backend]] — DialersController, CallLogsController, FollowUpEmailsController
- [[email-system]] — OutboundEmail, token replacement
- [[frontend]] — DialerPanel, useLeadsPage dialer state
