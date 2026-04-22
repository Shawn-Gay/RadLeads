import type { CallSession, CallSessionListItem } from '@/types'
import { apiFetch } from '@/lib/api'

export async function getCallSessions(dialerId?: string): Promise<CallSessionListItem[]> {
  const qs = dialerId ? `?dialerId=${dialerId}` : ''
  return apiFetch<CallSessionListItem[]>(`/api/call-sessions${qs}`)
}

export async function startSession(dialerId?: string): Promise<CallSession> {
  return apiFetch<CallSession>('/api/call-sessions', {
    method: 'POST',
    body: JSON.stringify({ dialerId: dialerId ?? null }),
  })
}

export async function patchSession(id: string, patch: {
  leadsCalledCount?: number
  totalPausedSeconds?: number
  end?: boolean
}): Promise<CallSession> {
  return apiFetch<CallSession>(`/api/call-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      leadsCalledCount:   patch.leadsCalledCount   ?? null,
      totalPausedSeconds: patch.totalPausedSeconds ?? null,
      end:                patch.end                ?? false,
    }),
  })
}
