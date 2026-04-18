import type { Script, ScriptFeedback, ScriptStats } from '@/types'
import { apiFetch } from '@/lib/api'

export async function getScripts(includeArchived = false): Promise<Script[]> {
  return apiFetch<Script[]>(`/api/scripts?includeArchived=${includeArchived}`)
}

export async function getScript(id: string): Promise<Script> {
  return apiFetch<Script>(`/api/scripts/${id}`)
}

export async function createScript(name: string, body: string): Promise<Script> {
  return apiFetch<Script>('/api/scripts', {
    method: 'POST',
    body: JSON.stringify({ name, body }),
  })
}

export async function updateScript(id: string, name: string, body: string): Promise<Script> {
  return apiFetch<Script>(`/api/scripts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, body }),
  })
}

export async function archiveScript(id: string, archived = true): Promise<Script> {
  return apiFetch<Script>(`/api/scripts/${id}/archive?archived=${archived}`, {
    method: 'POST',
  })
}

export async function deleteScript(id: string): Promise<void> {
  await apiFetch<void>(`/api/scripts/${id}`, { method: 'DELETE' })
}

export async function getScriptStats(id: string, dialerId?: string): Promise<ScriptStats> {
  const qs = dialerId ? `?dialerId=${dialerId}` : ''
  return apiFetch<ScriptStats>(`/api/scripts/${id}/stats${qs}`)
}

export async function getScriptFeedback(id: string): Promise<ScriptFeedback[]> {
  return apiFetch<ScriptFeedback[]>(`/api/scripts/${id}/feedback`)
}

export interface PostFeedbackInput {
  callLogId?: string
  dialerId?: string
  note: string
  bodySnapshot?: string
}

export async function postScriptFeedback(id: string, input: PostFeedbackInput): Promise<ScriptFeedback> {
  return apiFetch<ScriptFeedback>(`/api/scripts/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function setDialerSelectedScript(dialerId: string, scriptId: string | null): Promise<{ id: string; name: string; selectedScriptId: string | null }> {
  return apiFetch(`/api/dialers/${dialerId}/selected-script`, {
    method: 'POST',
    body: JSON.stringify({ scriptId }),
  })
}
