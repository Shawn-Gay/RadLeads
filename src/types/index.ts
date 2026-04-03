export type EmailSource = 'csv' | 'guessed' | 'scraped' | 'api'
export type EmailStatus = 'verified' | 'bounced' | 'unknown'
export type EnrichStatus = 'not_enriched' | 'researching' | 'researched' | 'enriching' | 'enriched' | 'failed'
export type CampaignStatus = 'active' | 'draft' | 'paused'
export type AccountStatus = 'active' | 'warming' | 'paused'
export type AccountProvider = 'namecheap' | 'google' | 'smtp'

// Tier 3 — sticky notes on a folder
export interface LeadEmail {
  address: string
  source: EmailSource
  isPrimary: boolean
  status: EmailStatus
}

// Tier 2 — the folder (a person at a company)
export interface LeadPerson {
  id: string
  firstName: string
  lastName: string
  title: string
  linkedinUrl?: string
  phone?: string | null
  city?: string
  emails: LeadEmail[]
  // Populated after enrichment
  icebreaker?: string
  painPoint?: string
  campaignIds: number[]
}

// Tier 1 — the filing cabinet drawer (domain = anchor)
export interface Company {
  id: string
  domain: string
  name: string
  employees?: string
  // Populated after enrichment
  summary?: string
  genericEmails?: string[]
  recentNews?: string
  enrichStatus: EnrichStatus
  researchedAt?: string
  enrichedAt?: string
  people: LeadPerson[]
}

export interface CampaignStep {
  id: number
  day: number
  subject: string
  body: string
}

export interface Campaign {
  id: number
  name: string
  status: CampaignStatus
  fromEmail: string
  leads: number
  sent: number
  opens: number
  replies: number
  steps: CampaignStep[]
}

export interface EmailAccount {
  id: number
  email: string
  provider: AccountProvider
  status: AccountStatus
  health: number | null
  sentToday: number
  dailyLimit: number
  warmupDay: number | null
  warmupTotalDays: number
  warmupBatchId: string | null
}

export type WarmupActionType = 'sent' | 'marked_not_spam' | 'marked_read' | 'starred' | 'replied'

export interface WarmupActivity {
  id: number
  accountId: number
  partnerEmail: string
  action: WarmupActionType
  timestamp: string
}

export interface WarmupBatch {
  id: string
  name: string
  createdAt: string
}

export interface ThreadMessage {
  from: string
  body: string
  time: string
}

export interface InboxMessage {
  id: number
  from: string
  name: string
  company: string
  subject: string
  preview: string
  time: string
  read: boolean
  thread: ThreadMessage[]
}

// Used when importing from CSV
export interface ImportPersonInput {
  domain: string
  companyName?: string
  firstName: string
  lastName: string
  title?: string
  email: string
  phone?: string | null
  city?: string
  linkedinUrl?: string
}
