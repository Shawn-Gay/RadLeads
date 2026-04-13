import { apiFetch } from '@/lib/api'

export interface SendFollowUpInput {
  personId?: string
  companyId: string
  fromAccountId: string
  toEmail: string
  subject: string
  body: string
}

export async function sendFollowUpEmail(input: SendFollowUpInput): Promise<void> {
  await apiFetch('/api/follow-up-emails', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
