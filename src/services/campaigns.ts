import type { Campaign, CampaignStatus } from '@/types'
import { apiFetch } from '@/lib/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCampaign(raw: any): Campaign {
  return {
    id:        raw.id,
    name:      raw.name,
    status:    (raw.status as string).toLowerCase() as CampaignStatus,
    senderIds: raw.senderIds ?? [],
    leads:     raw.enrolledCount ?? 0,
    sent:      raw.sent ?? 0,
    opens:     raw.opens ?? 0,
    replies:   raw.replies ?? 0,
    steps: (raw.steps ?? []).map((s: any) => ({
      id:      s.id,
      day:     s.day,
      subject: s.subject,
      body:    s.body,
    })),
  }
}

export async function getCampaigns(): Promise<Campaign[]> {
  const data = await apiFetch<any[]>('/api/campaigns')
  return data.map(mapCampaign)
}

export async function createCampaign(c: Omit<Campaign, 'id'>): Promise<Campaign> {
  const raw = await apiFetch<any>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name:      c.name,
      senderIds: c.senderIds,
      steps:     c.steps.map(o => ({ id: o.id, day: o.day, subject: o.subject, body: o.body })),
    }),
  })
  return mapCampaign(raw)
}

export async function saveCampaign(c: Campaign): Promise<Campaign> {
  const raw = await apiFetch<any>(`/api/campaigns/${c.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name:      c.name,
      senderIds: c.senderIds,
      steps:     c.steps.map(o => ({ id: o.id, day: o.day, subject: o.subject, body: o.body })),
    }),
  })
  return mapCampaign(raw)
}

export async function patchCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign> {
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const raw = await apiFetch<any>(`/api/campaigns/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(capitalize(status)),
  })
  return mapCampaign(raw)
}

export async function enrollPeople(campaignId: string, personIds: string[]): Promise<void> {
  await apiFetch(`/api/campaigns/${campaignId}/enroll`, {
    method: 'POST',
    body: JSON.stringify(personIds),
  })
}

export async function unenrollPerson(campaignId: string, personId: string): Promise<void> {
  await apiFetch(`/api/campaigns/${campaignId}/enroll/${personId}`, {
    method: 'DELETE',
  })
}
