# Accounts & Email Dispatch — Backend Plan

## What the UI expects (from fake data)

| Entity | Fields |
|---|---|
| `EmailAccount` | email, provider, status, health%, sentToday, dailyLimit, warmupDay, warmupTotalDays, warmupBatchId |
| `WarmupActivity` | accountId, partnerEmail, action (sent/marked_not_spam/marked_read/starred/replied), timestamp |
| `WarmupBatch` | id, name, createdAt |

The ConnectModal captures: email, password, SMTP host/port, IMAP host/port, dailyLimit.
The "Test & Connect" step is currently faked (2.2s sleep → success).

---

## On Resend

**Short answer: don't use Resend for campaign dispatch.**

Resend is a transactional email API — it sends *from Resend's infrastructure* on your domain's behalf.
For cold outreach you need to send *from the user's actual Namecheap inbox* so that:
- Replies land in that inbox (IMAP)
- Warmup traffic is tied to the real mailbox reputation
- The From address is the inbox the prospect will reply to

**Resend is a good fit for:** system emails — account invites, password resets, export notifications.

For campaigns and warmup: use **raw SMTP** (MailKit library in .NET) to send directly through the user's inbox credentials.

---

## Phase 1 — Credential Storage & Real Connection Test

**Backend changes needed:**

- Add `smtpHost`, `smtpPort`, `imapHost`, `imapPort` columns to `EmailAccount` in DB
- Add `password` field — **store encrypted**, not plaintext  
  - Use AES-GCM with a key from env var (`ENCRYPTION_KEY`)
- Add `POST /api/emailaccounts/test` endpoint that:
  1. Accepts credentials in the request body
  2. Opens a real SMTP connection (MailKit) and authenticates
  3. Opens a real IMAP connection and authenticates
  4. Returns `{ success: true }` or `{ success: false, error: "..." }`
- On success, frontend calls `POST /api/emailaccounts` to save the account

**Package:** `MailKit` (NuGet) — handles both SMTP and IMAP.

---

## Phase 2 — Warmup Engine

The warmup system sends emails between accounts in the same batch, then performs engagement actions (mark read, not spam, star, reply) to build inbox reputation.

**How it works:**
1. Each warmup account sends a small number of emails *to other accounts in its batch* each day
2. The receiving accounts read the IMAP inbox, find the warmup emails, and:
   - Mark as not spam (move from spam to inbox)
   - Mark as read
   - Star
   - Occasionally reply
3. Volume ramps up day-over-day (e.g. day 1 = 2 emails, day 30 = 30 emails)
4. `warmupDay` increments each day the account successfully completes its warmup round
5. `health` is calculated from the spam/inbox ratio of received warmup emails

**Backend endpoints needed:**
- `POST /api/warmup/run` — triggers one warmup cycle (called by the scheduler)
- `GET /api/warmup/activities/{accountId}` — returns recent activity log

---

## Phase 3 — Campaign Dispatch

When a campaign is set to `active`:
1. Pull enrolled leads from DB (Company → Person → primary email)
2. For each lead, determine which step they're on based on when they were enrolled and what's been sent
3. Substitute template tokens (`{{firstName}}`, `{{company}}`, etc.)
4. Inject tracking pixel + rewrite links (see Phase 3a)
5. Send via SMTP using the campaign's assigned sender account(s)
6. Record the send in a `CampaignSend` table with a unique token per email
7. Increment `sentToday` on the account; respect `dailyLimit`

**Backend endpoints needed:**
- `POST /api/campaigns/{id}/send` — runs one dispatch tick for the campaign
- `GET /api/campaigns/{id}/sends` — send history

---

## Phase 3a — Engagement Tracking

MailKit sends and receives emails — it does not track opens, clicks, or replies on its own.
Each of these requires a different mechanism:

### Open tracking
Before sending, inject a 1×1 transparent pixel into the email HTML:
```html
<img src="https://your-api.railway.app/track/open?t={token}" width="1" height="1" style="display:none" />
```
When the recipient's client loads images, `GET /track/open` fires, you mark the send as opened.
**Caveat:** Apple Mail (and some other clients) prefetch images regardless of whether the user opened it.
Clients that block remote images won't trigger it at all. Treat open rate as a directional signal, not ground truth.

### Click tracking
Rewrite all links in the email body before sending:
```
https://targetsite.com  →  https://your-api.railway.app/track/click?t={token}&url=aHR0cHM6...
```
`GET /track/click` records the click, then 302 redirects to the decoded URL. More reliable than open tracking.

### Reply tracking
Polled via IMAP during the `health-check` job. For each account, scan the inbox for emails whose
`In-Reply-To` header matches a `MessageId` stored in `CampaignSend`. When found, mark that send as replied.

### Bounce tracking
Same IMAP poll. Delivery failure emails (NDRs) land in the inbox — parse subject/body for bounce patterns,
mark the lead email as `bounced`.

**New tracking endpoints:**
- `GET /track/open?t={token}` — record open, return 1×1 GIF
- `GET /track/click?t={token}&url={base64url}` — record click, 302 redirect

---

## Phase 4 — Scheduled Jobs (Railway Crons vs In-Process)

### Railway Crons
Railway can call an HTTP endpoint on your API on a schedule. Simple, zero infrastructure.

**Pros:** no extra code in the app, visible in Railway dashboard, easy to trigger manually  
**Cons:** the endpoint is publicly reachable — you must protect it with a secret header

```
# railway.json cron example
POST /api/jobs/warmup      → runs every day at 8am UTC
POST /api/jobs/send        → runs every hour
POST /api/jobs/reset-daily → runs at midnight UTC (resets sentToday)
```

Protect with a shared secret: Railway sets `CRON_SECRET=xyz` as an env var, the endpoint checks `Authorization: Bearer xyz`.

**This is fine for your scale.** Railway Crons is the right call here — don't add Hangfire/Quartz unless you outgrow it.

### What each job does

| Job | Schedule | Purpose |
|---|---|---|
| `POST /api/jobs/warmup` | Daily, 8am UTC | Run warmup cycle for all `warming` accounts |
| `POST /api/jobs/send` | Hourly | Dispatch pending campaign emails (respects daily limits) |
| `POST /api/jobs/reset-daily` | Midnight UTC | Reset `sentToday = 0` on all accounts |
| `POST /api/jobs/health-check` | Daily | Poll IMAP for each account, update `health` score |

---

## Summary of New DB Columns / Tables

**`EmailAccount` additions:**
- `SmtpHost`, `SmtpPort` (int)
- `ImapHost`, `ImapPort` (int)
- `EncryptedPassword` (string)

**New table: `CampaignSend`**
- `Id`, `Token` (unique GUID for tracking), `CampaignId`, `CampaignStepId`, `PersonId`, `AccountId`
- `SentAt`, `OpenedAt?`, `ClickedAt?`, `RepliedAt?`, `BouncedAt?`
- `MessageId` (SMTP Message-ID header, used to match IMAP replies/bounces)

**New table: `WarmupEmail`** (tracks sent warmup emails awaiting engagement)
- `Id`, `FromAccountId`, `ToAccountId`, `MessageId` (IMAP UID), `SentAt`, `EngagedAt?`

---

## NuGet Packages to Add

```
MailKit          — SMTP + IMAP client
MimeKit          — email message construction (comes with MailKit)
```

No Resend SDK needed for the core flow.
