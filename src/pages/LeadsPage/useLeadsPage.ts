import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppContext } from '@/context/AppContext'
import { useDialerContext } from '@/context/DialerContext'
import type { Company } from '@/types'
import type { TabKey, SortKey, SortDir } from './constants'
import { STAGE_ORDER, DEFAULT_SORT_DIR } from './constants'

export function useLeadsPage() {
  const {
    companies, campaigns,
    updateCompany, addFromImport, addFromCompanyImport,
    queueResearchCompanies, queueEnrichCompanies,
    enrollPeopleInCampaign,
    currentDialer, dialers,
  } = useAppContext()

  const {
    callLogsByCompany, callLogsByPerson, attemptsByPerson, scoreByCompany,
    showIdentityModal, setShowIdentityModal,
    showAssignModal, setShowAssignModal,
    startDialer, openDialer,
    dialerQueue,
  } = useDialerContext()

  const dialerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of dialers) map.set(d.id, d.name)
    return map
  }, [dialers])

  const [expandedIds, setExpandedIds]               = useState<Set<string>>(new Set())
  const [checkedIds, setCheckedIds]                 = useState<Set<string>>(new Set())
  const [selected, setSelected]                     = useState<{ companyId: string; personId: string } | null>(null)
  const [activeTab, setActiveTab]                   = useState<TabKey>(currentDialer ? 'my_assigned' : 'enriched')
  const [search, setSearch]                         = useState('')
  const [showImport, setShowImport]                 = useState(false)
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
  const [sortKey, setSortKey]                       = useState<SortKey | null>(currentDialer ? null : 'assigned')
  const [sortDir, setSortDir]                       = useState<SortDir>('asc')
  const campaignPickerRef                           = useRef<HTMLDivElement>(null)

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
  const researchedCount = useMemo(() => companies.filter(o => o.enrichStatus === 'researched').length, [companies])
  const enrichedCount   = useMemo(() => companies.filter(o => o.enrichStatus === 'enriched').length, [companies])

  // Companies with pending callbacks
  const callbackCompanyIds = useMemo(() => {
    const now = new Date().toISOString()
    const ids = new Set<string>()
    for (const [companyId, logs] of callLogsByCompany) {
      const latest = logs[0]
      if (latest?.outcome === 'CallBack' && (!latest.callbackAt || latest.callbackAt <= now)) {
        ids.add(companyId)
      }
    }
    return ids
  }, [callLogsByCompany])

  const tabCounts = useMemo(() => ({
    all:             companies.length,
    my_assigned:     currentDialer ? companies.filter(o => o.assignedToId === currentDialer.id).length : 0,
    callbacks:       [...callbackCompanyIds].filter(id => companies.some(o => o.id === id)).length,
    not_enriched:    companies.filter(o => o.enrichStatus === 'not_enriched' || o.enrichStatus === 'researching').length,
    researched:      companies.filter(o => o.enrichStatus === 'researched'   || o.enrichStatus === 'enriching').length,
    enriched:        companies.filter(o => o.enrichStatus === 'enriched').length,
    research_failed: companies.filter(o => o.enrichStatus === 'research_failed').length,
    in_campaign:     companies.filter(o => o.people.some(p => p.campaignIds.length > 0)).length,
  }), [companies, callbackCompanyIds, currentDialer])

  const filtered = useMemo(() => {
    let list = companies
    if      (activeTab === 'my_assigned')   list = currentDialer ? list.filter(o => o.assignedToId === currentDialer.id) : []
    else if (activeTab === 'callbacks')     list = list.filter(o => callbackCompanyIds.has(o.id))
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
  }, [companies, activeTab, search, callbackCompanyIds, currentDialer])

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'domain') {
        cmp = a.domain.localeCompare(b.domain)
      } else if (sortKey === 'people') {
        cmp = a.people.length - b.people.length
      } else if (sortKey === 'lastCall') {
        const la = callLogsByCompany.get(a.id)?.[0]?.calledAt ?? ''
        const lb = callLogsByCompany.get(b.id)?.[0]?.calledAt ?? ''
        if (!la && !lb) cmp = 0
        else if (!la)   return 1
        else if (!lb)   return -1
        else cmp = la.localeCompare(lb)
      } else if (sortKey === 'assigned') {
        const na = a.assignedToId ? (dialerNameById.get(a.assignedToId) ?? '') : ''
        const nb = b.assignedToId ? (dialerNameById.get(b.assignedToId) ?? '') : ''
        if (!na && !nb) cmp = 0
        // Unassigned floats to top on asc, bottom on desc
        else if (!na)   return -1 * dir
        else if (!nb)   return  1 * dir
        else cmp = na.localeCompare(nb)
      } else if (sortKey === 'stage') {
        cmp = STAGE_ORDER[a.enrichStatus] - STAGE_ORDER[b.enrichStatus]
      }
      if (cmp === 0) cmp = a.domain.localeCompare(b.domain)
      return cmp * dir
    })
    return arr
  }, [filtered, sortKey, sortDir, callLogsByCompany, dialerNameById])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === DEFAULT_SORT_DIR[key]) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setSortKey(null)
      }
    } else {
      setSortKey(key)
      setSortDir(DEFAULT_SORT_DIR[key])
    }
  }

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
    if (personIds.length > 0) enrollPeopleInCampaign(personIds, campaignId)
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
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const allChecked  = filtered.length > 0 && filtered.every(o => checkedIds.has(o.id))
  const someChecked = checkedIds.size > 0

  return {
    companies, campaigns, filtered: sortedFiltered, selectedDetail, dialerNameById,
    expandedIds, checkedIds, selected, setSelected,
    activeTab, setActiveTab,
    search, setSearch,
    showImport, setShowImport,
    showCampaignPicker, setShowCampaignPicker, campaignPickerRef,
    sortKey, sortDir, toggleSort,
    totalPeople, researchedCount, enrichedCount, tabCounts,
    checkedNotStartedCount, checkedResearchedCount, checkedEnrichedCount,
    allChecked, someChecked,
    currentDialer,
    showIdentityModal, setShowIdentityModal,
    showAssignModal, setShowAssignModal,
    dialerQueue,
    callLogsByPerson, callLogsByCompany, attemptsByPerson, scoreByCompany,
    startDialer, openDialer,
    toggleExpand, toggleCheck, toggleCheckAll,
    handleResearch, handleEnrich,
    handleResearchSelected, handleEnrichSelected, handleAddToCampaign,
    exportCSV, addFromImport, addFromCompanyImport,
  }
}
