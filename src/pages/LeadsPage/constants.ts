import type { EnrichStatus, EmailSource, EmailStatus, CallOutcome } from '@/types'

export const ENRICH_CONFIG: Record<EnrichStatus, { label: string; cls: string; spin?: boolean }> = {
  not_enriched: { label: 'Not Started',  cls: 'bg-muted text-muted-foreground' },
  researching:  { label: 'Researching…', cls: 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400', spin: true },
  researched:   { label: 'Researched',   cls: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400' },
  enriching:    { label: 'Enriching…',   cls: 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400', spin: true },
  enriched:     { label: 'Enriched',     cls: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' },
  research_failed: { label: 'Research Failed', cls: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' },
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

export type TabKey = 'all' | 'not_enriched' | 'researched' | 'enriched' | 'research_failed' | 'in_campaign'

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'not_enriched', label: 'Not Started' },
  { key: 'researched',   label: 'Researched' },
  { key: 'enriched',     label: 'Enriched' },
  { key: 'research_failed', label: 'Research Failed' },
  { key: 'in_campaign',  label: 'In Campaign' },
]

// Grid column layout for company header + company rows
export const COMPANY_GRID = 'grid-cols-[32px_32px_1fr_80px_120px_144px_72px]'
