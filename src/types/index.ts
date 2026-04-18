export type DialDisposition = 'None' | 'NotInterested' | 'BadNumber' | 'Converted'

export interface Dialer {
  id: string
  name: string
  selectedScriptId?: string | null
}

export interface Script {
  id: string
  name: string
  body: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface ScriptFeedback {
  id: string
  scriptId: string
  callLogId?: string
  dialerId?: string
  note: string
  bodySnapshot?: string
  createdAt: string
}

export interface ScriptStatsPerDialer {
  dialerId: string
  dialerName: string
  totalCalls: number
  outcomeCounts: Record<string, number>
}

export interface ScriptStats {
  scriptId: string
  totalCalls: number
  outcomeCounts: Record<string, number>
  perDialer: ScriptStatsPerDialer[]
}

export interface EmailTemplateOutcomeAssignment {
  id: string
  outcome: CallOutcome
  isDefault: boolean
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  isArchived: boolean
  outcomeAssignments: EmailTemplateOutcomeAssignment[]
  createdAt: string
  updatedAt: string
}

export interface EmailTemplateStats {
  emailTemplateId: string
  totalSends: number
  statusCounts: Record<string, number>
}

export type EmailSource = 'csv' | 'guessed' | 'scraped' | 'api'
export type CallOutcome = 'Connected' | 'LeftVoicemail' | 'LeftMessage' | 'NoAnswer' | 'WrongNumber' | 'CallBack' | 'NotInterested' | 'Interested'

export interface CallLog {
  id: string
  personId?: string
  companyId?: string
  calledPhone: string
  outcome: CallOutcome
  notes?: string
  calledAt: string
  callbackAt?: string
  scriptId?: string
  dialerId?: string
}
export type OutboundEmailStatus = 'Pending' | 'Sent' | 'Failed'

export interface FollowUpEmail {
  id: string
  personId?: string
  companyId?: string
  emailAccountId: string
  toAddress: string
  subject: string
  status: OutboundEmailStatus
  sentAt?: string
  createdAt: string
  errorMessage?: string
  openCount: number
  clickCount: number
}

export type EmailStatus = 'verified' | 'bounced' | 'unknown'
export type EnrichStatus = 'not_enriched' | 'researching' | 'researched' | 'enriching' | 'enriched' | 'research_failed' | 'unreachable'
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
  sourcePage?: string
  followUpEmailTemplate?: string
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
  recentNews?: string
  phone?: string | null
  email?: string | null
  enrichStatus: EnrichStatus
  researchedAt?: string
  enrichedAt?: string
  meetingLink?: string
  pagesCrawledCount: number
  assignedToId?: string | null
  assignedAt?: string | null
  dialDisposition: DialDisposition
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
  // Sender persona — used for token replacement in personalized emails
  firstName: string | null
  lastName: string | null
  title: string | null
  companyName: string | null
  phone: string | null
  calendarLink: string | null
  signature: string | null
}

export interface SenderPersonaInput {
  firstName: string | null
  lastName: string | null
  title: string | null
  companyName: string | null
  phone: string | null
  calendarLink: string | null
  signature: string | null
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
  callStatus?: string | null
}

export interface ImportCompanyInput {
  domain: string
  companyName?: string
  phone?: string | null
  email?: string | null
  employees?: string
  callStatus?: string | null
}
