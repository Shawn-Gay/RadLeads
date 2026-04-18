import { createContext, useContext, useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAppContext } from './AppContext'
import { getAllCallLogs } from '@/services/callLogs'
import { scoreCompany } from '@/lib/scoring'
import type { Company, CallLog, Dialer, DialDisposition } from '@/types'

interface PendingClaim { companyId: string; personId: string | null }

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
  dialerCompany:  Company | null
  dialerPersonId: string | null

  showIdentityModal: boolean
  setShowIdentityModal: (v: boolean) => void
  showAssignModal: boolean
  setShowAssignModal: (v: boolean) => void

  startDialer: () => void
  openDialer:  (companyId: string, personId?: string) => void
  dialerPrev:      () => void
  dialerNext:      () => void
  dialerNextCold:  () => void
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
  const [dialerMode, setDialerMode]                 = useState(false)
  const [dialerIndex, setDialerIndex]               = useState<number | null>(null)
  const [dialerPersonId, setDialerPersonId]         = useState<string | null>(null)
  const [sessionQueueIds, setSessionQueueIds]       = useState<string[] | null>(null)
  const [showIdentityModal, setShowIdentityModal]   = useState(false)
  const [showAssignModal, setShowAssignModal]       = useState(false)
  const [pendingClaim, setPendingClaim]             = useState<PendingClaim | null>(null)
  const [pendingDialerCompanyId, setPendingDialerCompanyId] = useState<string | null>(null)

  const refreshCallLogs = useCallback(() => {
    getAllCallLogs().then(setCallLogs).catch(err => console.error('Failed to load call logs:', err))
  }, [])
  useEffect(() => { refreshCallLogs() }, [refreshCallLogs])

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

  const candidateQueue = useMemo(() => {
    const assigned = currentDialer
      ? companies.filter(o => o.assignedToId === currentDialer.id && o.dialDisposition === 'None')
      : []
    return [...assigned].sort((a, b) =>
      scoreCompany(b, callLogsByCompany.get(b.id) ?? []) -
      scoreCompany(a, callLogsByCompany.get(a.id) ?? [])
    )
  }, [companies, currentDialer, callLogsByCompany])

  const dialerQueue = useMemo(() => {
    if (!sessionQueueIds) return candidateQueue
    const byId = new Map(candidateQueue.map(o => [o.id, o]))
    return sessionQueueIds.map(id => byId.get(id)).filter((o): o is Company => !!o)
  }, [sessionQueueIds, candidateQueue])

  // Sync frozen session list with the live candidate pool
  useEffect(() => {
    if (!sessionQueueIds) return
    const candIds = candidateQueue.map(o => o.id)
    const candSet = new Set(candIds)
    const kept = sessionQueueIds.filter(id => candSet.has(id))
    const newcomers = candIds.filter(id => !new Set(kept).has(id))
    if (kept.length !== sessionQueueIds.length || newcomers.length > 0) {
      setSessionQueueIds([...kept, ...newcomers])
    }
  }, [candidateQueue, sessionQueueIds])

  // After a claim, wait for queue to include the company then set index
  useEffect(() => {
    if (!pendingDialerCompanyId) return
    const idx = dialerQueue.findIndex(o => o.id === pendingDialerCompanyId)
    if (idx !== -1) {
      setDialerIndex(idx)
      setPendingDialerCompanyId(null)
    }
  }, [pendingDialerCompanyId, dialerQueue])

  // Pin current company by id so queue re-sorts don't move the cursor
  const dialerCompanyId = dialerIndex !== null ? (dialerQueue[dialerIndex]?.id ?? null) : null
  useEffect(() => {
    if (!dialerMode || !dialerCompanyId) return
    const idx = dialerQueue.findIndex(o => o.id === dialerCompanyId)
    if (idx !== -1 && idx !== dialerIndex) setDialerIndex(idx)
  }, [dialerQueue, dialerMode, dialerCompanyId, dialerIndex])

  async function claimAndOpen(companyId: string, personId: string | null, dialerId: string) {
    try {
      await claimCompanyForDialer(companyId, dialerId)
    } catch (err) {
      console.error('Claim failed:', err)
      return
    }
    if (!sessionQueueIds) setSessionQueueIds(candidateQueue.map(o => o.id))
    setDialerMode(true)
    setDialerPersonId(personId)
    setPendingDialerCompanyId(companyId)
    navigate({ to: '/dialer' })
  }

  function startDialer() {
    if (!currentDialer) { setShowIdentityModal(true); return }
    if (candidateQueue.length === 0) { setShowAssignModal(true); return }
    setSessionQueueIds(candidateQueue.map(o => o.id))
    setDialerMode(true)
    setDialerIndex(0)
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
    if (dialerIndex < dialerQueue.length - 1) {
      setDialerIndex(dialerIndex + 1)
      setDialerPersonId(null)
      return
    }
    setDialerMode(false)
    setSessionQueueIds(null)
    setDialerIndex(null)
    setDialerPersonId(null)
    navigate({ to: '/leads' })
  }

  function dialerNextCold() {
    if (dialerIndex === null) return
    for (let i = dialerIndex + 1; i < dialerQueue.length; i++) {
      if (!callLogsByCompany.has(dialerQueue[i].id)) {
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
      dialerMode, dialerIndex, dialerQueue,
      dialerCompany: dialerIndex !== null ? (dialerQueue[dialerIndex] ?? null) : null,
      dialerPersonId,
      showIdentityModal, setShowIdentityModal,
      showAssignModal, setShowAssignModal,
      startDialer, openDialer, dialerPrev, dialerNext, dialerNextCold, dialerExit,
      handleDropCompany, handleAssigned, handleIdentitySelected,
    }}>
      {children}
    </DialerContext.Provider>
  )
}
