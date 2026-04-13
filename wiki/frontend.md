# Frontend

> React 19 + Vite app — pages, context, services, routing.

## Tech stack

- **React 19** + TypeScript
- **Vite** (build + dev server, port 5173)
- **Tailwind v4** + **shadcn/ui** components
- **TanStack Query** (server state), **TanStack Table** (data grids), **TanStack Router** (routing)
- **Tiptap** (rich text editor — used in email composer)
- Path alias: `@/` → `src/`

## State model

`AppContext` (`src/context/AppContext.tsx`) is the single global store.

```
API (fetch) → src/services/*.ts → AppContext state → page components
```

**State slices:**
| Slice | Type | Loaded |
|-------|------|--------|
| `companies` | `Company[]` | startup |
| `campaigns` | `Campaign[]` | startup |
| `accounts` | `EmailAccount[]` | startup |
| `warmupActivities` | `WarmupActivity[]` | startup |
| `inbox` | `InboxMessage[]` | startup |
| `dialers` | `Dialer[]` | startup |
| `currentDialer` | `Dialer \| null` | startup (restored from `localStorage`) |

All mutations use optimistic updates where possible, then fire the API call.  
Rule: **no hardcoded data in page components** — everything flows through services → context.

## Services (`src/services/`)

| File | Calls |
|------|-------|
| `leads.ts` | `getLeads`, `importPeople`, `importCompanies`, `queueResearch`, `queueEnrich`, `assignLeads`, `dropLead` |
| `dialers.ts` | `getDialers`, `createDialer` |
| `campaigns.ts` | `getCampaigns`, `createCampaign`, `saveCampaign`, `enrollPeople`, `unenrollPerson` |
| `accounts.ts` | `getAccounts`, `getWarmupActivities`, `patchAccountStatus`, `deleteAccount`, `updateSenderInfo` |
| `callLogs.ts` | call log CRUD |
| `followUpEmails.ts` | follow-up email queue |
| `inbox.ts` | `getInbox`, `markMessageRead` |

## Pages

### LeadsPage (`src/pages/LeadsPage/`)
Main workhorse. Contains:
- `LeadsPage.tsx` — outer shell, toolbar; renders full-page DialerPanel when `dialerMode && dialerCompany`
- `useLeadsPage.ts` — all local state + filter logic + dialer queue/navigation
- `CompanyRow.tsx` — expandable company row
- `PersonRow.tsx` — person row inside expanded company
- `DialerPanel.tsx` — full-page call panel (replaces leads list during a dialer session)
- `DialerIdentityModal.tsx` — "Who's dialing?" picker/creator
- `AssignLeadsModal.tsx` — lead count slider; calls `POST /api/companies/assign`
- `constants.ts` — ENRICH_CONFIG, COMPANY_GRID, tab defs, objection playbook, scoring signals

### AccountsPage (`src/pages/AccountsPage/`)
Email account management.
- `AccountCard.tsx` — per-account card
- `ConnectModal.tsx` — add new account modal

### Other pages
- `CampaignsPage.tsx` — campaign list
- `CampaignEditPage/` — multi-step editor (Tiptap for email body)
- `DashboardPage.tsx` — summary stats
- `EnrichPage.tsx` — enrichment queue view
- `InboxPage.tsx` — reply inbox
- `SettingsPage.tsx`

## Key components (`src/components/`)

- `leads/ImportCSVDialog.tsx` — CSV import flow (people + companies)
- `leads/LeadDetailPanel.tsx` — slide-out detail panel for a lead

## Utilities (`src/lib/`)

- `tokens.ts` — email template token replacement (`{{firstName}}`, etc.)
- `scoring.ts` — lead scoring logic

## Types (`src/types/index.ts`)

Single file. Key types: `Company`, `LeadPerson`, `LeadEmail`, `Campaign`, `CampaignStep`, `EmailAccount`, `CallLog`, `WarmupActivity`, `InboxMessage`, `Dialer`.  
Enum types: `EnrichStatus`, `DialDisposition`, `CallOutcome`, `EmailSource`, `EmailStatus`.  
Import/input types: `ImportPersonInput`, `ImportCompanyInput`, `SenderPersonaInput`.

## Related
- [[architecture]] — routing table, overall layout
- [[domain-model]] — TypeScript types mirror C# entities
- [[dialer]] — DialerPanel component
- [[email-system]] — CampaignEditPage, AccountsPage
