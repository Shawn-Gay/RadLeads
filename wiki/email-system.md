# Email System

> Campaign dispatch, account warmup, inbox, and tracking.

## Campaigns

### Data model
- `Campaign` — name, status (`active|draft|paused`), M2M People + M2M EmailAccount senders
- `CampaignStep` — `Day` (sequence day), `Subject`, `Body` (Tiptap HTML)
- `CampaignSend` — per-send record with unique `Token` (for open/click tracking)

### Lifecycle
1. Create campaign (draft)
2. Add steps (subject + body per day)
3. Assign sender accounts
4. Enroll people (`POST /api/campaigns/:id/enroll`)
5. Activate → `CampaignScheduleJob` queues sends at 8:05 AM UTC daily
6. `EmailDispatchJob` dequeues + sends every 5 min via `ICampaignDispatchService`

### Token replacement
`src/lib/tokens.ts` handles `{{firstName}}`, `{{lastName}}`, `{{companyName}}`, etc.  
Sender persona fields on `EmailAccount` feed these tokens (set per-account in AccountsPage).

### Tracking
`TrackingController` handles:
- Open pixel (1x1 transparent image)
- Click redirect (rewrite links → tracking URL → redirect to real URL)
Lookup by `CampaignSend.Token` (unique index).

## Email Accounts

### Provider support
`AccountProvider` enum: `namecheap | google | smtp`

### Status lifecycle
```
warming → active → paused → inactive
```

### Warmup system
Goal: build sender reputation before sending real campaigns.

**WarmupScheduleJob** (8:00 AM UTC):
- Pairs accounts with warmup partners
- Schedules warmup emails for the day
- Scales volume based on `WarmupDay` / `WarmupTotalDays`

**WarmupEngageJob** (every 1 hr):
- Opens warmup emails, marks not-spam, stars, replies, reacts
- Records each action as `WarmupActivity` (type: `sent|marked_not_spam|marked_read|starred|replied|reacted`)

**EmailConnectionService** (singleton):
- Manages IMAP/SMTP connection pool
- Credentials encrypted at rest via `EncryptionService`

### Sender persona
Fields on `EmailAccount`: `FirstName`, `LastName`, `Title`, `CompanyName`, `Phone`, `CalendarLink`, `Signature`  
Used as token sources in campaign templates. Set via AccountsPage → ConnectModal/edit flow.

## Inbox

- `InboxReply` entity — stores inbound replies
- `InboxController` — `GET /api/inbox`, mark-read
- `InboxPage` — thread reader UI

## Send services

| Service | When used |
|---------|-----------|
| `MailKitEmailSendService` | Default SMTP send |
| `BrevoEmailSendService` | Brevo API transactional send |

## Outbound emails (non-campaign)

`OutboundEmail` entity — tracks emails sent outside campaigns (e.g. follow-ups from dialer).  
Optional `PersonId` + `CompanyId` link for context.  
Queued via `FollowUpEmailsController`.

## Related
- [[domain-model]] — Campaign, EmailAccount, CampaignSend, OutboundEmail entities
- [[backend]] — job schedules, service registration
- [[dialer]] — follow-up email trigger from call panel
- [[frontend]] — CampaignEditPage, AccountsPage, InboxPage
