import { apiFetch } from '@/lib/api'
import type { FollowUpEmail } from '@/types'

export interface SendFollowUpInput {
  personId?: string
  companyId: string
  fromAccountId: string
  toEmail: string
  subject: string
  body: string
  emailTemplateId?: string
}

export async function sendFollowUpEmail(input: SendFollowUpInput): Promise<void> {
  await apiFetch('/api/follow-up-emails', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getFollowUpEmailsByCompany(companyId: string): Promise<FollowUpEmail[]> {
  return apiFetch(`/api/follow-up-emails/company/${companyId}`)
}
