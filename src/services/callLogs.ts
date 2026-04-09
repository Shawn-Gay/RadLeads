import type { CallLog, CallOutcome } from '@/types'
import { apiFetch } from '@/lib/api'

export interface LogCallInput {
  personId?: string
  companyId?: string
  calledPhone: string
  outcome: CallOutcome
  notes?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCallLog(raw: any): CallLog {
  return {
    id:          raw.id,
    personId:    raw.personId ?? undefined,
    companyId:   raw.companyId ?? undefined,
    calledPhone: raw.calledPhone,
    outcome:     raw.outcome as CallOutcome,
    notes:       raw.notes ?? undefined,
    calledAt:    raw.calledAt,
  }
}

export async function getAllCallLogs(): Promise<CallLog[]> {
  const data = await apiFetch<any[]>('/api/call-logs')
  return data.map(mapCallLog)
}

export async function logCall(input: LogCallInput): Promise<CallLog> {
  const raw = await apiFetch<any>('/api/call-logs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return mapCallLog(raw)
}

export async function getCallLogsByPerson(personId: string): Promise<CallLog[]> {
  const data = await apiFetch<any[]>(`/api/call-logs/person/${personId}`)
  return data.map(mapCallLog)
}

export async function getCallLogsByCompany(companyId: string): Promise<CallLog[]> {
  const data = await apiFetch<any[]>(`/api/call-logs/company/${companyId}`)
  return data.map(mapCallLog)
}
