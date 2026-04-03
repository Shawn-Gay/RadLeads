import type { EmailAccount, WarmupActivity, WarmupBatch } from '@/types'

export const ACCOUNTS0: EmailAccount[] = [
  {
    id: 1,
    email: 'shawn@radcoreai.com',
    provider: 'namecheap',
    status: 'active',
    health: 94,
    sentToday: 23,
    dailyLimit: 40,
    warmupDay: null,
    warmupTotalDays: 30,
    warmupBatchId: null,
  },
  {
    id: 2,
    email: 'outreach@radleads.io',
    provider: 'namecheap',
    status: 'warming',
    health: 71,
    sentToday: 8,
    dailyLimit: 15,
    warmupDay: 12,
    warmupTotalDays: 30,
    warmupBatchId: 'batch-a',
  },
  {
    id: 3,
    email: 'hello@radleads.io',
    provider: 'smtp',
    status: 'warming',
    health: 58,
    sentToday: 6,
    dailyLimit: 15,
    warmupDay: 7,
    warmupTotalDays: 30,
    warmupBatchId: 'batch-a',
  },
  {
    id: 4,
    email: 'contact@radleads.io',
    provider: 'namecheap',
    status: 'paused',
    health: null,
    sentToday: 0,
    dailyLimit: 40,
    warmupDay: null,
    warmupTotalDays: 30,
    warmupBatchId: null,
  },
]

export const WARMUP_ACTIVITIES0: WarmupActivity[] = [
  { id: 1,  accountId: 2, partnerEmail: 'hello@radleads.io',    action: 'sent',             timestamp: '2025-03-31T08:14:00Z' },
  { id: 2,  accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'marked_not_spam',  timestamp: '2025-03-31T08:16:00Z' },
  { id: 3,  accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'marked_read',      timestamp: '2025-03-31T08:17:00Z' },
  { id: 4,  accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'replied',          timestamp: '2025-03-31T09:02:00Z' },
  { id: 5,  accountId: 2, partnerEmail: 'hello@radleads.io',    action: 'replied',          timestamp: '2025-03-31T09:45:00Z' },
  { id: 6,  accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'starred',          timestamp: '2025-03-31T10:10:00Z' },
  { id: 7,  accountId: 2, partnerEmail: 'hello@radleads.io',    action: 'replied',          timestamp: '2025-03-31T11:30:00Z' },
  { id: 8,  accountId: 2, partnerEmail: 'hello@radleads.io',    action: 'sent',             timestamp: '2025-04-01T08:05:00Z' },
  { id: 9,  accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'marked_not_spam',  timestamp: '2025-04-01T08:08:00Z' },
  { id: 10, accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'marked_read',      timestamp: '2025-04-01T08:09:00Z' },
  { id: 11, accountId: 3, partnerEmail: 'outreach@radleads.io', action: 'replied',          timestamp: '2025-04-01T09:15:00Z' },
  { id: 12, accountId: 2, partnerEmail: 'hello@radleads.io',    action: 'replied',          timestamp: '2025-04-01T10:00:00Z' },
]

export const BATCHES0: WarmupBatch[] = [
  { id: 'batch-a', name: 'Batch A', createdAt: '2025-03-20T00:00:00Z' },
]
