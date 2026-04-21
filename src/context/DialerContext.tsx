import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAppContext } from './AppContext'
import { getAllCallLogs } from '@/services/callLogs'
import { scoreCompany } from '@/lib/scoring'
import { buildDialerQueue, type QueueBuckets } from '@/lib/dialerQueue'
import type { Company, CallLog, Dialer, DialDisposition } from '@/types'

interface PendingClaim { companyId: string; personId: string | null }

const DIALER_SESSION_KEY = 'radleads:dialerSession'

interface PersistedSession {
  mode: boolean
  queue: string[] | null
  index: number | null
  personId: string | null
}

function loadPersistedSession(): PersistedSession {
  try {
    const raw = localStorage.getItem(DIALER_SESSION_KEY)
    if (!raw) return { mode: false, queue: null, index: null, personId: null }
    const p = JSON.parse(raw)
    return {
      mode:     !!p.mode,
      queue:    Array.isArray(p.queue) ? p.queue.filter((x: unknown) => typeof x === 'string') : null,
      index:    typeof p.index === 'number' ? p.index : null,
      personId: typeof p.personId === 'string' ? p.personId : null,
    }
  } catch {
    return { mode: false, queue: null, index: null, personId: null }
  }
}

export interface DialerContextValue {
  callLogs: CallLog[]
  callLogsByCompany: Map<string, CallLog[]>
  callLogsByPerson:  Map<string, CallLog>
  attemptsByPerson:  Map<string, number>
  scoreByCompany:    Map<string, number>
  refreshCallLogs: () => void

  dialerMode:     boolean
  dialerIndex:    number | null
  dialerQueue:    Company[]
  dialerBuckets:  QueueBuckets
  dialerCompany:  Company | null
  dialerPersonId: string | null
  /** Every company assigned to the current dialer, regardless of cadence status or disposition. */
  assignedCompanies: Company[]
  /** Buckets over all eligible assigned leads — NOT filtered by the active session queue. */
  allBuckets:     QueueBuckets

  showIdentityModal: boolean
  setShowIdentityModal: (v: boolean) => void
  showAssignModal: boolean
  setShowAssignModal: (v: boolean) => void

  startDialer: () => void
  openDialer:  (companyId: string, personId?: string) => void
  dialerPrev:      () => void
  dialerNext:      () => void
  dialerNextCold:  () => void
  dialerJumpTo:    (index: number) => void
  dialerExit:      () => void
  handleDropCompany:    (companyId: string, disposition: DialDisposition) => Promise<void>
  handleAssigned:       () => void
  handleIdentitySelected: (dialer: Dialer) => void
}

const DialerContext = createContext<DialerContextValue | null>(null)

export function useDialerContext() {
  const ctx = useContext(DialerContext)
  if (!ctx) throw new Error('useDialerContext outside DialerContextProvider')
  return ctx
}

export function DialerContextProvider({ children }: { children: ReactNode }) {
  const { companies, currentDialer, setCurrentDialer, claimCompanyForDialer, dropCompany } = useAppContext()
  const navigate = useNavigate()

  const [callLogs, setCallLogs]                     = useState<CallLog[]>([])
  const persisted = useMemo(loadPersistedSession, [])
  const [dialerMode, setDialerMode]                 = useState(persisted.mode)
  const [dialerIndex, setDialerIndex]               = useState<number | null>(persisted.index)
  const [dialerPersonId, setDialerPersonId]         = useState<string | null>(persisted.personId)
  const [sessionQueueIds, setSessionQueueIds]       = useState<string[] | null>(persisted.queue)
  const [showIdentityModal, setShowIdentityModal]   = useState(false)
  const [showAssignModal, setShowAssignModal]       = useState(false)
  const [pendingClaim, setPendingClaim]             = useState<PendingClaim | null>(null)
  const [pendingDialerCompanyId, setPendingDialerCompanyId] = useState<string | null>(null)
  // True when dialerNext exhausts due leads — suppresses the auto-snap effect so the
  // user stays on the empty state instead of being pulled back onto the just-called lead
  // before refreshCompany reclassifies it as scheduled.
  const [sessionEnded, setSessionEnded]             = useState(false)

  const refreshCallLogs = useCallback(() => {
    getAllCallLogs().then(setCallLogs).catch(err => console.error('Failed to load call logs:', err))
  }, [])
  useEffect(() => { refreshCallLogs() }, [refreshCallLogs])

  // Persist session so /dialer refresh resumes instead of bouncing to /leads
  useEffect(() => {
    localStorage.setItem(DIALER_SESSION_KEY, JSON.stringify({
      mode:     dialerMode,
      queue:    sessionQueueIds,
      index:    dialerIndex,
      personId: dialerPersonId,
    }))
  }, [dialerMode, sessionQueueIds, dialerIndex, dialerPersonId])

  const callLogsByPerson = useMemo(() => {
    const map = new Map<string, CallLog>()
    for (const log of callLogs) {
      if (!log.personId) continue
      const ex = map.get(log.personId)
      if (!ex || log.calledAt > ex.calledAt) map.set(log.personId, log)
    }
    return map
  }, [callLogs])

  const callLogsByCompany = useMemo(() => {
    const map = new Map<string, CallLog[]>()
    for (const log of callLogs) {
      if (!log.companyId) continue
      const arr = map.get(log.companyId) ?? []
      arr.push(log)
      map.set(log.companyId, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => b.calledAt.localeCompare(a.calledAt))
    return map
  }, [callLogs])

  const attemptsByPerson = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of callLogs) {
      if (!log.personId) continue
      map.set(log.personId, (map.get(log.personId) ?? 0) + 1)
    }
    return map
  }, [callLogs])

  const scoreByCompany = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of companies) map.set(c.id, scoreCompany(c, callLogsByCompany.get(c.id) ?? []))
    return map
  }, [companies, callLogsByCompany])

  const assignedCompanies = useMemo(
    () => currentDialer ? companies.filter(o => o.assignedToId === currentDialer.id) : [],
    [companies, currentDialer],
  )

  const candidateBuckets = useMemo(() => {
    const eligible = assignedCompanies.filter(o => o.dialDisposition === 'None')
    return buildDialerQueue(eligible, callLogsByCompany)
  }, [assignedCompanies, callLogsByCompany])

  const candidateQueue = candidateBuckets.flat

  const dialerQueue = useMemo(() => {
    if (!sessionQueueIds) return candidateQueue
    // Include scheduled leads in the lookup — a lead that advanced to scheduled mid-session
    // should remain navigable in the dialer queue, not vanish from under dialerIndex.
    const byId = new Map<string, Company>()
    for (const o of candidateQueue)              byId.set(o.id, o)
    for (const o of candidateBuckets.scheduled)  byId.set(o.id, o)
    return sessionQueueIds.map(id => byId.get(id)).filter((o): o is Company => !!o)
  }, [sessionQueueIds, candidateQueue, candidateBuckets])

  const dialerBuckets = useMemo<QueueBuckets>(() => {
    if (!sessionQueueIds) return candidateBuckets
    // Intersect each bucket with the session queue, preserving bucket membership
    const inSession = new Set(sessionQueueIds)
    return {
      callbacks: candidateBuckets.callbacks.filter(o => inSession.has(o.id)),
      dueToday:  candidateBuckets.dueToday.filter(o => inSession.has(o.id)),
      fresh:     candidateBuckets.fresh.filter(o => inSession.has(o.id)),
      scheduled: candidateBuckets.scheduled.filter(o => inSession.has(o.id)),
    }
  }, [candidateBuckets, sessionQueueIds])

  // Sync frozen session list with the live candidate pool.
  // Leads that moved to scheduled (cadence advanced this session) are preserved — only truly
  // terminal leads (Completed/Dropped, no longer in any bucket) get evicted.
  useEffect(() => {
    if (!sessionQueueIds) return
    const candIds = candidateQueue.map(o => o.id)
    const candSet = new Set(candIds)
    const scheduledSet = new Set(candidateBuckets.scheduled.map(o => o.id))
    const kept = sessionQueueIds.filter(id => candSet.has(id) || scheduledSet.has(id))
    const newcomers = candIds.filter(id => !new Set(kept).has(id))
    if (kept.length !== sessionQueueIds.length || newcomers.length > 0) {
      setSessionQueueIds([...kept, ...newcomers])
    }
  }, [candidateQueue, candidateBuckets, sessionQueueIds])

  // After a claim, wait for queue to include the company then set index
  useEffect(() => {
    if (!pendingDialerCompanyId) return
    const idx = dialerQueue.findIndex(o => o.id === pendingDialerCompanyId)
    if (idx !== -1) {
      setDialerIndex(idx)
      setPendingDialerCompanyId(null)
    }
  }, [pendingDialerCompanyId, dialerQueue])

  // Empty-queue entry: when a session has no due leads (all scheduled or fresh assignments
  // arrive), auto-snap to the first *due* lead as soon as one appears. Must not snap to
  // scheduled leads — those are preserved in dialerQueue for pinning, not for auto-focus.
  useEffect(() => {
    if (!dialerMode || dialerIndex !== null || pendingDialerCompanyId || sessionEnded) return
    const dueIds = new Set<string>()
    for (const o of dialerBuckets.callbacks) dueIds.add(o.id)
    for (const o of dialerBuckets.dueToday)  dueIds.add(o.id)
    for (const o of dialerBuckets.fresh)     dueIds.add(o.id)
    if (dueIds.size === 0) return
    const firstDue = dialerQueue.findIndex(o => dueIds.has(o.id))
    if (firstDue !== -1) setDialerIndex(firstDue)
  }, [dialerMode, dialerIndex, pendingDialerCompanyId, sessionEnded, dialerQueue, dialerBuckets])

  // Pin current company by id so queue re-sorts don't move the cursor
  const dialerCompanyId = dialerIndex !== null ? (dialerQueue[dialerIndex]?.id ?? null) : null
  useEffect(() => {
    if (!dialerMode || !dialerCompanyId) return
    const idx = dialerQueue.findIndex(o => o.id === dialerCompanyId)
    if (idx !== -1 && idx !== dialerIndex) setDialerIndex(idx)
  }, [dialerQueue, dialerMode, dialerCompanyId, dialerIndex])

  // Clamp out-of-bounds index (can happen after a restore when the persisted
  // queue resolves to fewer companies than it had originally)
  useEffect(() => {
    if (!dialerMode || dialerIndex === null) return
    if (dialerIndex >= dialerQueue.length) {
      setDialerIndex(dialerQueue.length > 0 ? dialerQueue.length - 1 : null)
    }
  }, [dialerMode, dialerQueue.length, dialerIndex])

  async function claimAndOpen(companyId: string, personId: string | null, dialerId: string) {
    try {
      await claimCompanyForDialer(companyId, dialerId)
    } catch (err) {
      console.error('Claim failed:', err)
      return
    }
    if (!sessionQueueIds) setSessionQueueIds(candidateQueue.map(o => o.id))
    setSessionEnded(false)
    setDialerMode(true)
    setDialerPersonId(personId)
    setPendingDialerCompanyId(companyId)
    navigate({ to: '/dialer' })
  }

  function startDialer() {
    if (!currentDialer) { setShowIdentityModal(true); return }
    setSessionQueueIds(candidateQueue.map(o => o.id))
    setSessionEnded(false)
    setDialerMode(true)
    setDialerIndex(candidateQueue.length > 0 ? 0 : null)
    setDialerPersonId(null)
    navigate({ to: '/dialer' })
  }

  function openDialer(companyId: string, personId?: string) {
    if (!currentDialer) {
      setPendingClaim({ companyId, personId: personId ?? null })
      setShowIdentityModal(true)
      return
    }
    const idx = dialerQueue.findIndex(o => o.id === companyId)
    if (idx !== -1) {
      if (!sessionQueueIds) setSessionQueueIds(dialerQueue.map(o => o.id))
      setSessionEnded(false)
      setDialerMode(true)
      setDialerIndex(idx)
      setDialerPersonId(personId ?? null)
      navigate({ to: '/dialer' })
      return
    }
    claimAndOpen(companyId, personId ?? null, currentDialer.id)
  }

  function handleIdentitySelected(dialer: Dialer) {
    setCurrentDialer(dialer)
    setShowIdentityModal(false)
    if (pendingClaim) {
      const { companyId, personId } = pendingClaim
      setPendingClaim(null)
      claimAndOpen(companyId, personId, dialer.id)
      return
    }
    setShowAssignModal(true)
  }

  function handleAssigned() {
    setShowAssignModal(false)
    setSessionEnded(false)
    if (dialerMode) return
    setDialerMode(true)
    setDialerIndex(0)
    setDialerPersonId(null)
    navigate({ to: '/dialer' })
  }

  async function handleDropCompany(companyId: string, disposition: DialDisposition) {
    await dropCompany(companyId, disposition)
    dialerNext()
  }

  function dialerPrev() {
    if (dialerIndex === null || dialerIndex <= 0) return
    setDialerIndex(dialerIndex - 1)
    setDialerPersonId(null)
  }

  function dialerNext() {
    if (dialerIndex === null) return
    const dueIds = new Set<string>()
    for (const o of dialerBuckets.callbacks) dueIds.add(o.id)
    for (const o of dialerBuckets.dueToday)  dueIds.add(o.id)
    for (const o of dialerBuckets.fresh)     dueIds.add(o.id)
    for (let i = dialerIndex + 1; i < dialerQueue.length; i++) {
      if (dueIds.has(dialerQueue[i].id)) {
        setDialerIndex(i)
        setDialerPersonId(null)
        return
      }
    }
    // No more due leads — stay on /dialer with the empty state instead of bouncing away
    setDialerIndex(null)
    setDialerPersonId(null)
    setSessionEnded(true)
  }

  function dialerJumpTo(index: number) {
    if (index < 0 || index >= dialerQueue.length) return
    setSessionEnded(false)
    setDialerIndex(index)
    setDialerPersonId(null)
  }

  function dialerNextCold() {
    if (dialerIndex === null) return
    for (let i = dialerIndex + 1; i < dialerQueue.length; i++) {
      if (dialerQueue[i].cadenceStatus === 'NotStarted') {
        setDialerIndex(i)
        setDialerPersonId(null)
        return
      }
    }
  }

  function dialerExit() {
    setDialerMode(false)
    setDialerIndex(null)
    setDialerPersonId(null)
    setSessionQueueIds(null)
    navigate({ to: '/leads' })
  }

  return (
    <DialerContext.Provider value={{
      callLogs, callLogsByCompany, callLogsByPerson, attemptsByPerson, scoreByCompany, refreshCallLogs,
      dialerMode, dialerIndex, dialerQueue, dialerBuckets, assignedCompanies,
      allBuckets: candidateBuckets,
      dialerCompany: dialerIndex !== null ? (dialerQueue[dialerIndex] ?? null) : null,
      dialerPersonId,
      showIdentityModal, setShowIdentityModal,
      showAssignModal, setShowAssignModal,
      startDialer, openDialer, dialerPrev, dialerNext, dialerNextCold, dialerJumpTo, dialerExit,
      handleDropCompany, handleAssigned, handleIdentitySelected,
    }}>
      {children}
    </DialerContext.Provider>
  )
}
