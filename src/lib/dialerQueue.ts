import type { Company, CallLog } from '@/types'
import { scoreCompany } from './scoring'

export const CADENCE_DAYS = [0, 2, 4, 7, 11, 18, 30] as const
export const CADENCE_TOTAL_TOUCHES = CADENCE_DAYS.length

export interface QueueBuckets {
  callbacks: Company[]
  dueToday:  Company[]
  fresh:     Company[]
  /** Cadence active but not yet due — hidden from sidebar, still tracked so jumpTo works */
  scheduled: Company[]
}

export interface DialerQueueResult extends QueueBuckets {
  /** Flat ordered list: callbacks → dueToday → fresh. Scheduled/terminal leads are excluded. */
  flat: Company[]
}

function endOfToday(now: Date): Date {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d
}

export function buildDialerQueue(
  companies: Company[],
  callLogsByCompany: Map<string, CallLog[]>,
  now: Date = new Date(),
): DialerQueueResult {
  const cutoff = endOfToday(now).getTime()

  const callbacks: Company[] = []
  const dueToday:  Company[] = []
  const fresh:     Company[] = []
  const scheduled: Company[] = []

  for (const c of companies) {
    switch (c.cadenceStatus) {
      case 'Paused': {
        const at = c.nextTouchAt ? Date.parse(c.nextTouchAt) : Number.POSITIVE_INFINITY
        if (at <= cutoff) callbacks.push(c)
        else scheduled.push(c)
        break
      }
      case 'Active': {
        const at = c.nextTouchAt ? Date.parse(c.nextTouchAt) : 0
        if (at <= cutoff) dueToday.push(c)
        else scheduled.push(c)
        break
      }
      case 'NotStarted':
        fresh.push(c)
        break
      default:
        // Completed / Dropped — excluded
        break
    }
  }

  // Callbacks: earliest time first (most overdue on top)
  callbacks.sort((a, b) => {
    const aAt = a.nextTouchAt ? Date.parse(a.nextTouchAt) : 0
    const bAt = b.nextTouchAt ? Date.parse(b.nextTouchAt) : 0
    return aAt - bAt
  })

  // Due Today: most overdue first, then score as tiebreaker
  dueToday.sort((a, b) => {
    const aAt = a.nextTouchAt ? Date.parse(a.nextTouchAt) : 0
    const bAt = b.nextTouchAt ? Date.parse(b.nextTouchAt) : 0
    if (aAt !== bAt) return aAt - bAt
    return scoreCompany(b, callLogsByCompany.get(b.id) ?? []) -
           scoreCompany(a, callLogsByCompany.get(a.id) ?? [])
  })

  // Fresh: score-ranked — first touch should hit the best leads first
  fresh.sort((a, b) =>
    scoreCompany(b, callLogsByCompany.get(b.id) ?? []) -
    scoreCompany(a, callLogsByCompany.get(a.id) ?? [])
  )

  return {
    callbacks,
    dueToday,
    fresh,
    scheduled,
    flat: [...callbacks, ...dueToday, ...fresh],
  }
}

export function cadenceDay(company: Company, now: Date = new Date()): number | null {
  if (!company.cadenceStartedAt) return null
  const started = Date.parse(company.cadenceStartedAt)
  const ms = now.getTime() - started
  return Math.max(0, Math.floor(ms / 86_400_000))
}
