import { apiFetch } from '@/lib/api'
import type { InboxMessage } from '@/types'

export function getInbox(): Promise<InboxMessage[]> {
  return apiFetch<InboxMessage[]>('/api/inbox')
}

export function markMessageRead(id: string): Promise<void> {
  return apiFetch<void>(`/api/inbox/${id}/read`, { method: 'PATCH' })
}
