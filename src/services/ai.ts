import { apiFetch } from '@/lib/api'

export async function generateCampaignStep(
  stepIndex: number,
  totalSteps: number,
  day: number
): Promise<{ subject: string; body: string }> {
  return apiFetch('/api/ai/generate-step', {
    method: 'POST',
    body: JSON.stringify({ stepIndex, totalSteps, day }),
  })
}

export async function draftReply(senderName: string, lastMessage: string): Promise<string> {
  const result = await apiFetch<{ body: string }>('/api/ai/draft-reply', {
    method: 'POST',
    body: JSON.stringify({ senderName, lastMessage }),
  })
  return result.body
}
