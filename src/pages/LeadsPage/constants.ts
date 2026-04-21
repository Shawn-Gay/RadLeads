import type { EnrichStatus, EmailSource, EmailStatus, CallOutcome } from '@/types'

export const ENRICH_CONFIG: Record<EnrichStatus, { label: string; cls: string; spin?: boolean }> = {
  not_enriched: { label: 'Not Started',  cls: 'bg-muted text-muted-foreground' },
  researching:  { label: 'Researching…', cls: 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400', spin: true },
  researched:   { label: 'Researched',   cls: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400' },
  enriching:    { label: 'Enriching…',   cls: 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400', spin: true },
  enriched:     { label: 'Enriched',     cls: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' },
  research_failed: { label: 'Research Failed', cls: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' },
  unreachable:     { label: 'Unreachable',      cls: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' },
}

export const SOURCE_STYLES: Record<EmailSource, string> = {
  csv:     'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  guessed: 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
  scraped: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  api:     'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
}

export const SOURCE_LABELS: Record<EmailSource, string> = {
  csv: 'CSV', guessed: 'Guessed', scraped: 'Scraped', api: 'API',
}

export const STATUS_STYLES: Record<EmailStatus, string> = {
  verified: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  bounced:  'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  unknown:  'bg-muted text-muted-foreground',
}

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  Connected:      'Connected',
  LeftVoicemail:  'Left Voicemail',
  LeftMessage:    'Left Message',
  NoAnswer:       'No Answer',
  WrongNumber:    'Wrong Number',
  CallBack:       'Call Back',
  NotInterested:  'Not Interested',
  Interested:     'Interested',
}

export const CALL_OUTCOME_STYLES: Record<CallOutcome, string> = {
  Connected:      'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  LeftVoicemail:  'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  LeftMessage:    'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
  NoAnswer:       'bg-muted text-muted-foreground',
  WrongNumber:    'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  CallBack:       'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  NotInterested:  'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  Interested:     'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
}

export type TabKey = 'all' | 'my_assigned' | 'not_enriched' | 'researched' | 'enriched' | 'research_failed' | 'in_campaign' | 'callbacks'

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'my_assigned',     label: 'My Assigned' },
  { key: 'callbacks',       label: 'Callbacks Due' },
  { key: 'all',             label: 'All' },
  { key: 'not_enriched',    label: 'Not Started' },
  { key: 'researched',      label: 'Researched' },
  { key: 'enriched',        label: 'Enriched' },
  { key: 'research_failed', label: 'Research Failed' },
  { key: 'in_campaign',     label: 'In Campaign' },
]

// Grid column layout for company header + company rows
// Columns: expand | checkbox | domain/company | people | last call | assigned to | stage | action
export const COMPANY_GRID = 'grid-cols-[32px_32px_1fr_80px_120px_128px_144px_72px]'

// Stage ordering weight — used by sort
export const STAGE_ORDER: Record<EnrichStatus, number> = {
  not_enriched:    0,
  researching:     1,
  researched:      2,
  enriching:       3,
  enriched:        4,
  research_failed: 5,
  unreachable:     6,
}

export type SortKey = 'domain' | 'people' | 'lastCall' | 'assigned' | 'stage'
export type SortDir = 'asc' | 'desc'

// Default direction the first time a column is sorted
export const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  domain:   'asc',
  people:   'desc',
  lastCall: 'desc',
  assigned: 'asc',
  stage:    'asc',
}

// Outcomes that auto-toggle the follow-up email ON when a template is assigned
export const FOLLOW_UP_DEFAULT_ON: Set<CallOutcome> = new Set([
  'LeftVoicemail', 'LeftMessage', 'NoAnswer', 'Connected',
])

// Outcomes that end the cadence (drop or convert). No follow-up scheduled.
export const TERMINAL_OUTCOMES: Set<CallOutcome> = new Set([
  'Interested', 'NotInterested', 'WrongNumber',
])

// ─── Objection playbook ─────────────────────────────────────────────────────

export interface Objection { trigger: string; response: string }

export const OBJECTION_PLAYBOOK: Objection[] = [
  {
    trigger: "I'm busy / not a good time",
    response: "Totally understand, {{firstName}}. Just 30 seconds — we help companies like {{company}} generate qualified leads with AI outreach. Worth a 15-min chat this week?",
  },
  {
    trigger: "We already have something for that",
    response: "That's great to hear. Most of our clients did too. Quick question — are you happy with the volume of qualified meetings you're getting?",
  },
  {
    trigger: "Just send me an email",
    response: "Absolutely, I'll send that right over. Just so I send the right info — are you currently doing any outbound prospecting, or is it mostly inbound?",
  },
  {
    trigger: "How did you get my number?",
    response: "I was researching {{company}} and saw {{icebreaker}} — that's actually why I'm reaching out. We specialize in helping companies like yours build a consistent pipeline.",
  },
  {
    trigger: "What's this about?",
    response: "This is Shawn from RadcoreAI. I help companies like {{company}} generate qualified B2B leads using AI-driven outreach. I had a quick question about your current lead gen strategy.",
  },
  {
    trigger: "We don't have budget",
    response: "Totally fair, {{firstName}}. Most of our clients saw ROI within the first month. Would it make sense to at least see what it would look like for {{company}}? No commitment.",
  },
]
