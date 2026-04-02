export type LeadStatus = 'new' | 'contacted' | 'replied' | 'hot' | 'bounced'
export type CampaignStatus = 'active' | 'draft' | 'paused'
export type AccountStatus = 'active' | 'warming' | 'paused'

export interface Lead {
  id: number
  company: string
  domain: string
  firstName: string
  lastName: string
  title: string
  email: string
  phone: string | null
  city: string
  employees: string
  recentNews: string
  painPoint: string
  icebreaker: string
  status: LeadStatus
  score: number
  lastTouched: string
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
  status: AccountStatus
  health: number | null
  sentToday: number
  dailyLimit: number
  warmupDay: number | null
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
