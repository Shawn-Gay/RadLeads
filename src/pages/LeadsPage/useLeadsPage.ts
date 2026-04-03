import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppContext } from '@/context/AppContext'
import type { Company } from '@/types'
import type { TabKey } from './constants'

export function useLeadsPage() {
  const { companies, campaigns, updateCompany, addFromImport, addPersonToCampaign } = useAppContext()

  const [expandedIds, setExpandedIds]               = useState<Set<string>>(new Set())
  const [checkedIds, setCheckedIds]                 = useState<Set<string>>(new Set())
  const [selected, setSelected]                     = useState<{ companyId: string; personId: string } | null>(null)
  const [activeTab, setActiveTab]                   = useState<TabKey>('all')
  const [search, setSearch]                         = useState('')
  const [showImport, setShowImport]                 = useState(false)
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
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
  const researchedCount = useMemo(() => companies.filter(o => o.enrichStatus === 'researched' || o.enrichStatus === 'enriched').length, [companies])
  const enrichedCount   = useMemo(() => companies.filter(o => o.enrichStatus === 'enriched').length, [companies])

  const tabCounts = useMemo(() => ({
    all:          companies.length,
    not_enriched: companies.filter(o => o.enrichStatus === 'not_enriched' || o.enrichStatus === 'researching').length,
    researched:   companies.filter(o => o.enrichStatus === 'researched'   || o.enrichStatus === 'enriching').length,
    enriched:     companies.filter(o => o.enrichStatus === 'enriched').length,
    failed:       companies.filter(o => o.enrichStatus === 'failed').length,
    in_campaign:  companies.filter(o => o.people.some(p => p.campaignIds.length > 0)).length,
  }), [companies])

  const filtered = useMemo(() => {
    let list = companies
    if      (activeTab === 'not_enriched') list = list.filter(o => o.enrichStatus === 'not_enriched' || o.enrichStatus === 'researching')
    else if (activeTab === 'researched')   list = list.filter(o => o.enrichStatus === 'researched'   || o.enrichStatus === 'enriching')
    else if (activeTab === 'in_campaign')  list = list.filter(o => o.people.some(p => p.campaignIds.length > 0))
    else if (activeTab !== 'all')          list = list.filter(o => o.enrichStatus === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.domain.includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.people.some(p =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.emails.some(e => e.address.toLowerCase().includes(q))
        )
      )
    }
    return list
  }, [companies, activeTab, search])

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
    updateCompany(companyId, { enrichStatus: 'researching' })
    setTimeout(() => {
      updateCompany(companyId, {
        enrichStatus: 'researched',
        researchedAt: new Date().toISOString().slice(0, 10),
        summary: 'Business description and industry context collected from company website.',
        recentNews: 'Recent news and notable activity discovered during website research.',
      })
    }, 2200)
  }

  function handleEnrich(companyId: string) {
    updateCompany(companyId, { enrichStatus: 'enriching' })
    setTimeout(() => {
      updateCompany(companyId, {
        enrichStatus: 'enriched',
        enrichedAt: new Date().toISOString().slice(0, 10),
        genericEmails: ['info@domain.com', 'sales@domain.com'],
      })
    }, 2200)
  }

  function handleResearchSelected() {
    const toResearch = [...checkedIds].filter(id =>
      companies.find(o => o.id === id)?.enrichStatus === 'not_enriched'
    )
    toResearch.forEach(handleResearch)
    setCheckedIds(new Set())
  }

  function handleEnrichSelected() {
    const toEnrich = [...checkedIds].filter(id =>
      companies.find(o => o.id === id)?.enrichStatus === 'researched'
    )
    toEnrich.forEach(handleEnrich)
    setCheckedIds(new Set())
  }

  function handleAddToCampaign(campaignId: number) {
    const enrichedCompanies = [...checkedIds]
      .map(id => companies.find(o => o.id === id))
      .filter(o => o?.enrichStatus === 'enriched') as Company[]
    enrichedCompanies.forEach(company =>
      company.people.forEach(p => addPersonToCampaign(p.id, campaignId))
    )
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
    // actions
    toggleExpand, toggleCheck, toggleCheckAll,
    handleResearch, handleEnrich,
    handleResearchSelected, handleEnrichSelected, handleAddToCampaign,
    exportCSV, addFromImport,
  }
}
