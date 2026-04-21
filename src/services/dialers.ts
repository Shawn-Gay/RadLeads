import type { Dialer } from '@/types'
import { apiFetch } from '@/lib/api'

export async function getDialers(): Promise<Dialer[]> {
  return apiFetch<Dialer[]>('/api/dialers')
}

export async function createDialer(name: string): Promise<Dialer> {
  return apiFetch<Dialer>('/api/dialers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function setDialerDisabled(id: string, isDisabled: boolean): Promise<Dialer> {
  return apiFetch<Dialer>(`/api/dialers/${id}/disabled`, {
    method: 'PATCH',
    body: JSON.stringify({ isDisabled }),
  })
}
