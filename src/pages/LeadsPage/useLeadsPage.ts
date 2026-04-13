import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useAppContext } from '@/context/AppContext'
import { getAllCallLogs } from '@/services/callLogs'
import { scoreCompany } from '@/lib/scoring'
import type { Company, CallLog } from '@/types'
import type { TabKey } from './constants'

export function useLeadsPage() {
  const {
    companies, campaigns,
    updateCompany, addFromImport, addFromCompanyImport,
    queueResearchCompanies, queueEnrichCompanies,
    enrollPeopleInCampaign, dropCompany,
    currentDialer, setCurrentDialer,
  } = useAppContext()

  const [expandedIds, setExpandedIds]               = useState<Set<string>>(new Set())
  const [checkedIds, setCheckedIds]                 = useState<Set<string>>(new Set())
  const [selected, setSelected]                     = useState<{ companyId: string; personId: string } | null>(null)
  const [activeTab, setActiveTab]                   = useState<TabKey>('all')
  const [search, setSearch]                         = useState('')
  const [showImport, setShowImport]                 = useState(false)
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
  // dialer: index into `dialerQueue`, null = closed
  const [dialerMode, setDialerMode]                 = useState(false)
  const [dialerIndex, setDialerIndex]               = useState<number | null>(null)
  const [dialerPersonId, setDialerPersonId]         = useState<string | null>(null)
  const [callLogs, setCallLogs]                     = useState<CallLog[]>([])
  // identity + assignment modals
  const [showIdentityModal, setShowIdentityModal]   = useState(false)
  const [showAssignModal, setShowAssignModal]       = useState(false)
  const campaignPickerRef                           = useRef<HTMLDivElement>(null)

  // Fetch call logs on mount
  const refreshCallLogs = useCallback(() => {
    getAllCallLogs().then(setCallLogs).catch(err => console.error('Failed to load call logs:', err))
  }, [])

  useEffect(() => { refreshCallLogs() }, [refreshCallLogs])

  // Lookup: personId → most recent call log
  const callLogsByPerson = useMemo(() => {
    const map = new Map<string, CallLog>()
    for (const log of callLogs) {
      if (!log.personId) continue
      const existing = map.get(log.personId)
      if (!existing || log.calledAt > existing.calledAt) {
        map.set(log.personId, log)
      }
    }
    return map
  }, [callLogs])

  // Lookup: companyId → all call logs (newest first)
  const callLogsByCompany = useMemo(() => {
    const map = new Map<string, CallLog[]>()
    for (const log of callLogs) {
      if (!log.companyId) continue
      const arr = map.get(log.companyId) ?? []
      arr.push(log)
      map.set(log.companyId, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => b.calledAt.localeCompare(a.calledAt))
    }
    return map
  }, [callLogs])

  // Attempt counts: personId → number of calls
  const attemptsByPerson = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of callLogs) {
      if (!log.personId) continue
      map.set(log.personId, (map.get(log.personId) ?? 0) + 1)
    }
    return map
  }, [callLogs])

  // Companies with pending callbacks (callbackAt in the future or today, newest log has outcome=CallBack)
  const callbackCompanyIds = useMemo(() => {
    const now = new Date().toISOString()
    const ids = new Set<string>()
    for (const [companyId, logs] of callLogsByCompany) {
      const latest = logs[0] // already sorted newest first
      if (latest?.outcome === 'CallBack') {
        // Due if callbackAt is not set (user didn't pick a date) or callbackAt <= now
        if (!latest.callbackAt || latest.callbackAt <= now) {
          ids.add(companyId)
        }
      }
    }
    return ids
  }, [callLogsByCompany])

  useEffect(() => {
    if (!showCampaignPicker) return
    function handle(e: MouseEvent) {
      if (campaignPickerRef.current && !campaignPickerRef.current.contains(e.target as Node)) {
        setShowCampaignPicker(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showCampaignPicker])

  const totalPeople     = useMemo(() => companies.reduce((n, o) => n + o.people.length, 0), [companies])
  const researchedCount = useMemo(() => companies.filter(o => o.enrichStatus === 'researched' || o.enrichStatus === 'enriched').length, [companies])
  const enrichedCount   = useMemo(() => companies.filter(o => o.enrichStatus === 'enriched').length, [companies])

  const tabCounts = useMemo(() => ({
    all:             companies.length,
    callbacks:       [...callbackCompanyIds].filter(id => companies.some(o => o.id === id)).length,
    not_enriched:    companies.filter(o => o.enrichStatus === 'not_enriched' || o.enrichStatus === 'researching').length,
    researched:      companies.filter(o => o.enrichStatus === 'researched'   || o.enrichStatus === 'enriching').length,
    enriched:        companies.filter(o => o.enrichStatus === 'enriched').length,
    research_failed: companies.filter(o => o.enrichStatus === 'research_failed').length,
    in_campaign:     companies.filter(o => o.people.some(p => p.campaignIds.length > 0)).length,
  }), [companies, callbackCompanyIds])

  const filtered = useMemo(() => {
    let list = companies
    if      (activeTab === 'callbacks')     list = list.filter(o => callbackCompanyIds.has(o.id))
    else if (activeTab === 'not_enriched')  list = list.filter(o => o.enrichStatus === 'not_enriched' || o.enrichStatus === 'researching')
    else if (activeTab === 'researched')    list = list.filter(o => o.enrichStatus === 'researched'   || o.enrichStatus === 'enriching')
    else if (activeTab === 'in_campaign')   list = list.filter(o => o.people.some(p => p.campaignIds.length > 0))
    else if (activeTab !== 'all')           list = list.filter(o => o.enrichStatus === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.domain.includes(q) ||
        o.name.toLowerCase().includes(q) ||
        (o.phone ?? '').includes(q) ||
        o.people.some(p =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.emails.some(e => e.address.toLowerCase().includes(q)) ||
          (p.phone ?? '').includes(q)
        )
      )
    }
    return list
  }, [companies, activeTab, search, callbackCompanyIds])

  // Dialer queue: current dialer's assigned companies, sorted by priority score
  const dialerQueue = useMemo(() => {
    const assigned = currentDialer
      ? companies.filter(o => o.assignedToId === currentDialer.id && o.dialDisposition === 'None')
      : []
    return [...assigned].sort((a, b) => {
      const sa = scoreCompany(a, callLogsByCompany.get(a.id) ?? [])
      const sb = scoreCompany(b, callLogsByCompany.get(b.id) ?? [])
      return sb - sa
    })
  }, [companies, currentDialer, callLogsByCompany])

  // Score lookup for display
  const scoreByCompany = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of companies) {
      map.set(c.id, scoreCompany(c, callLogsByCompany.get(c.id) ?? []))
    }
    return map
  }, [companies, callLogsByCompany])

  const selectedDetail = useMemo(() => {
    if (!selected) return null
    const company = companies.find(o => o.id === selected.companyId)
    if (!company) return null
    const person = company.people.find(p => p.id === selected.personId)
    if (!person) return null
    return { company, person }
  }, [companies, selected])

  const checkedNotStartedCount = useMemo(() =>
    [...checkedIds].filter(id => companies.find(o => o.id === id)?.enrichStatus === 'not_enriched').length,
    [checkedIds, companies])

  const checkedResearchedCount = useMemo(() =>
    [...checkedIds].filter(id => companies.find(o => o.id === id)?.enrichStatus === 'researched').length,
    [checkedIds, companies])

  const checkedEnrichedCount = useMemo(() =>
    [...checkedIds].filter(id => companies.find(o => o.id === id)?.enrichStatus === 'enriched').length,
    [checkedIds, companies])

  function startDialer() {
    if (!currentDialer) {
      setShowIdentityModal(true)
      return
    }
    if (dialerQueue.length === 0) {
      setShowAssignModal(true)
      return
    }
    setDialerMode(true)
    setDialerIndex(0)
    setDialerPersonId(null)
  }

  function handleIdentitySelected(dialer: import('@/types').Dialer) {
    setCurrentDialer(dialer)
    setShowIdentityModal(false)
    // Queue will be empty for a new dialer, so prompt to assign
    setShowAssignModal(true)
  }

  function handleAssigned() {
    setShowAssignModal(false)
    setDialerMode(true)
    setDialerIndex(0)
    setDialerPersonId(null)
  }

  async function handleDropCompany(companyId: string, disposition: import('@/types').DialDisposition) {
    await dropCompany(companyId, disposition)
    // Move to next after drop
    dialerNext()
  }

  function openDialer(companyId: string, personId?: string) {
    const idx = dialerQueue.findIndex(o => o.id === companyId)
    if (idx === -1) return
    setDialerMode(true)
    setDialerIndex(idx)
    setDialerPersonId(personId ?? null)
  }

  function dialerPrev() {
    setDialerIndex(prev => {
      if (prev === null || prev <= 0) return prev
      return prev - 1
    })
    setDialerPersonId(null)
  }

  function dialerNext() {
    setDialerIndex(prev => {
      if (prev === null) return null
      if (prev < dialerQueue.length - 1) return prev + 1
      // Reached the end — exit dialer
      setDialerMode(false)
      return null
    })
    setDialerPersonId(null)
  }

  function dialerNextCold() {
    setDialerIndex(prev => {
      if (prev === null) return null
      for (let i = prev + 1; i < dialerQueue.length; i++) {
        if (!callLogsByCompany.has(dialerQueue[i].id)) return i
      }
      // Nothing cold ahead — stay put
      return prev
    })
    setDialerPersonId(null)
  }

  function dialerExit() {
    setDialerMode(false)
    setDialerIndex(null)
    setDialerPersonId(null)
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCheck(id: string, checked: boolean) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleCheckAll(checked: boolean) {
    setCheckedIds(checked ? new Set(filtered.map(o => o.id)) : new Set())
  }

  function handleResearch(companyId: string) {
    queueResearchCompanies([companyId]).catch(err => {
      // Roll back optimistic update on failure
      updateCompany(companyId, { enrichStatus: 'not_enriched' })
      console.error('Research queue failed:', err)
    })
  }

  function handleEnrich(companyId: string) {
    queueEnrichCompanies([companyId]).catch(err => {
      updateCompany(companyId, { enrichStatus: 'researched' })
      console.error('Enrich queue failed:', err)
    })
  }

  function handleResearchSelected() {
    const toResearch = [...checkedIds].filter(id =>
      companies.find(o => o.id === id)?.enrichStatus === 'not_enriched'
    )
    if (toResearch.length > 0) {
      queueResearchCompanies(toResearch).catch(err => console.error('Bulk research failed:', err))
    }
    setCheckedIds(new Set())
  }

  function handleEnrichSelected() {
    const toEnrich = [...checkedIds].filter(id =>
      companies.find(o => o.id === id)?.enrichStatus === 'researched'
    )
    if (toEnrich.length > 0) {
      queueEnrichCompanies(toEnrich).catch(err => console.error('Bulk enrich failed:', err))
    }
    setCheckedIds(new Set())
  }

  function handleAddToCampaign(campaignId: string) {
    const personIds = [...checkedIds]
      .map(id => companies.find(o => o.id === id))
      .filter((o): o is Company => o?.enrichStatus === 'enriched')
      .flatMap(o => o.people.map(p => p.id))
    if (personIds.length > 0) {
      enrollPeopleInCampaign(personIds, campaignId)
    }
    setShowCampaignPicker(false)
    setCheckedIds(new Set())
  }

  function exportCSV() {
    const headers = ['Domain', 'Company', 'First Name', 'Last Name', 'Title', 'Primary Email', 'Phone', 'City', 'Status']
    const rows = filtered.flatMap(c =>
      c.people.map(p => {
        const primary = p.emails.find(o => o.isPrimary) ?? p.emails[0]
        return [c.domain, c.name, p.firstName, p.lastName, p.title, primary?.address ?? '', p.phone ?? '', p.city ?? '', c.enrichStatus]
      })
    )
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const allChecked  = filtered.length > 0 && filtered.every(o => checkedIds.has(o.id))
  const someChecked = checkedIds.size > 0

  return {
    // data
    companies, campaigns, filtered, selectedDetail,
    // ui state
    expandedIds, checkedIds, selected, setSelected,
    activeTab, setActiveTab,
    search, setSearch,
    showImport, setShowImport,
    showCampaignPicker, setShowCampaignPicker, campaignPickerRef,
    // stats
    totalPeople, researchedCount, enrichedCount, tabCounts,
    // bulk counts
    checkedNotStartedCount, checkedResearchedCount, checkedEnrichedCount,
    // flags
    allChecked, someChecked,
    // dialer identity
    currentDialer, setCurrentDialer,
    showIdentityModal, setShowIdentityModal,
    showAssignModal, setShowAssignModal,
    handleIdentitySelected, handleAssigned, handleDropCompany,
    // dialer
    dialerMode,
    dialerIndex,
    dialerQueue,
    dialerCompany: dialerIndex !== null ? dialerQueue[dialerIndex] ?? null : null,
    dialerPersonId,
    startDialer, openDialer, dialerPrev, dialerNext, dialerNextCold, dialerExit,
    // call data
    callLogsByPerson, callLogsByCompany, attemptsByPerson, scoreByCompany, refreshCallLogs,
    // actions
    toggleExpand, toggleCheck, toggleCheckAll,
    handleResearch, handleEnrich,
    handleResearchSelected, handleEnrichSelected, handleAddToCampaign,
    exportCSV, addFromImport, addFromCompanyImport,
  }
}
