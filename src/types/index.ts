export type EmailSource = 'csv' | 'guessed' | 'scraped' | 'api'
export type EmailStatus = 'verified' | 'bounced' | 'unknown'
export type EnrichStatus = 'not_enriched' | 'researching' | 'researched' | 'enriching' | 'enriched' | 'research_failed'
export type CampaignStatus = 'active' | 'draft' | 'paused'
export type AccountStatus = 'active' | 'warming' | 'paused' | 'inactive'
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
  campaignIds: string[]
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
  id: string
  day: number
  subject: string
  body: string
}

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  senderIds: string[]
  leads: number
  sent: number
  opens: number
  replies: number
  steps: CampaignStep[]
}

export interface EmailAccount {
  id: string
  email: string
  provider: AccountProvider
  status: AccountStatus
  dailyLimit: number
  smtpHost: string
  smtpPort: number
  imapHost: string
  imapPort: number
  health: number | null
  sentToday: number
  warmupDay: number | null
  warmupTotalDays: number
}

export type WarmupActionType = 'sent' | 'marked_not_spam' | 'marked_read' | 'starred' | 'replied' | 'reacted'

export interface WarmupActivity {
  id: string
  accountId: string
  partnerEmail: string
  action: WarmupActionType
  timestamp: string
}


export interface ThreadMessage {
  from: string
  body: string
  time: string
}

export interface InboxMessage {
  id: string
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
