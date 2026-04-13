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
