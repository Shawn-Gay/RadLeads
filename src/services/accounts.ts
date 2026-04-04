import type { EmailAccount, WarmupActivity, WarmupActionType, AccountProvider, AccountStatus } from '@/types'
import { apiFetch } from '@/lib/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAccount(raw: any): EmailAccount {
  return {
    id:             raw.id,
    email:          raw.email,
    provider:       (raw.provider as string).toLowerCase() as AccountProvider,
    status:         (raw.status as string).toLowerCase() as AccountStatus,
    dailyLimit:     raw.dailyLimit,
    smtpHost:       raw.smtpHost,
    smtpPort:       raw.smtpPort,
    imapHost:       raw.imapHost,
    imapPort:       raw.imapPort,
    health:         raw.health ?? null,
    sentToday:      raw.sentToday ?? 0,
    warmupDay:      raw.warmupDay ?? null,
    warmupTotalDays: 30,
  }
}

// "MarkedNotSpam" to "marked_not_spam"
function mapAction(raw: string): WarmupActionType {
  return raw.replace(/([A-Z])/g, c => '_' + c.toLowerCase()).replace(/^_/, '') as WarmupActionType
}

export async function getAccounts(): Promise<EmailAccount[]> {
  const data = await apiFetch<any[]>('/api/emailaccounts')
  return data.map(mapAccount)
}

export async function testConnection(req: {
  email: string
  password: string
  smtpHost: string
  smtpPort: number
  imapHost: string
  imapPort: number
}): Promise<void> {
  await apiFetch('/api/emailaccounts/test', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function createAccount(req: {
  email: string
  password: string
  provider: AccountProvider
  dailyLimit: number
  smtpHost: string
  smtpPort: number
  imapHost: string
  imapPort: number
}): Promise<EmailAccount> {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const raw = await apiFetch<any>('/api/emailaccounts', {
    method: 'POST',
    body: JSON.stringify({ ...req, provider: capitalize(req.provider) }),
  })
  return mapAccount(raw)
}

export async function patchAccountStatus(id: string, status: AccountStatus): Promise<EmailAccount> {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const raw = await apiFetch<any>(`/api/emailaccounts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(capitalize(status)),
  })
  return mapAccount(raw)
}

export async function deleteAccount(id: string): Promise<void> {
  await apiFetch(`/api/emailaccounts/${id}`, { method: 'DELETE' })
}

export async function getWarmupActivities(): Promise<WarmupActivity[]> {
  const data = await apiFetch<any[]>('/api/warmup/activities')
  return data.map(o => ({
    id:           o.id,
    accountId:    o.accountId,
    partnerEmail: o.partnerEmail,
    action:       mapAction(o.action),
    timestamp:    o.createdAt,
  }))
}

export async function runWarmup(): Promise<{ accounts: number }> {
  return apiFetch<{ accounts: number }>('/api/warmup/run', { method: 'POST' })
}
