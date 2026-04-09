import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Company, LeadPerson, Campaign, EmailAccount, WarmupActivity, InboxMessage, ImportPersonInput, ImportCompanyInput } from '@/types'
import { getLeads, importPeople, importCompanies, queueResearch, queueEnrich } from '@/services/leads'
import { getCampaigns, createCampaign, saveCampaign, enrollPeople, unenrollPerson } from '@/services/campaigns'
import { getAccounts, getWarmupActivities, patchAccountStatus, deleteAccount } from '@/services/accounts'
import { getInbox, markMessageRead } from '@/services/inbox'

interface AppContextValue {
  companies: Company[]
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>
  addFromImport: (people: ImportPersonInput[]) => Promise<void>
  addFromCompanyImport: (inputs: ImportCompanyInput[]) => Promise<void>
  updateCompany: (id: string, partial: Partial<Omit<Company, 'people' | 'id'>>) => void
  updatePerson: (companyId: string, personId: string, partial: Partial<Omit<LeadPerson, 'id'>>) => void
  queueResearchCompanies: (ids: string[]) => Promise<void>
  queueEnrichCompanies: (ids: string[]) => Promise<void>
  enrollPeopleInCampaign: (personIds: string[], campaignId: string) => void
  removePersonFromCampaign: (personId: string, campaignId: string) => void
  campaigns: Campaign[]
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>
  addCampaign: (c: Omit<Campaign, 'id'>) => Promise<Campaign>
  updateCampaign: (c: Campaign) => void
  accounts: EmailAccount[]
  setAccounts: React.Dispatch<React.SetStateAction<EmailAccount[]>>
  addAccount: (account: EmailAccount) => void
  toggleAccountStatus: (account: EmailAccount) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  warmupActivities: WarmupActivity[]
  setWarmupActivities: React.Dispatch<React.SetStateAction<WarmupActivity[]>>
  inbox: InboxMessage[]
  setInbox: React.Dispatch<React.SetStateAction<InboxMessage[]>>
  markRead: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies]           = useState<Company[]>([])
  const [campaigns, setCampaigns]           = useState<Campaign[]>([])
  const [accounts, setAccounts]             = useState<EmailAccount[]>([])
  const [warmupActivities, setWarmupActivities] = useState<WarmupActivity[]>([])
  const [inbox, setInbox]                   = useState<InboxMessage[]>([])

  useEffect(() => {
    getLeads().then(setCompanies)
    getCampaigns().then(setCampaigns)
    getAccounts().then(setAccounts)
    getWarmupActivities().then(setWarmupActivities)
    getInbox().then(setInbox)
  }, [])

  async function addFromImport(people: ImportPersonInput[]): Promise<void> {
    const updated = await importPeople(people)
    setCompanies(prev => {
      const next = [...prev]
      for (const incoming of updated) {
        const idx = next.findIndex(o => o.id === incoming.id)
        if (idx >= 0) next[idx] = incoming
        else next.push(incoming)
      }
      return next
    })
  }

  async function addFromCompanyImport(inputs: ImportCompanyInput[]): Promise<void> {
    const updated = await importCompanies(inputs)
    setCompanies(prev => {
      const next = [...prev]
      for (const incoming of updated) {
        const idx = next.findIndex(o => o.id === incoming.id)
        if (idx >= 0) next[idx] = incoming
        else next.push(incoming)
      }
      return next
    })
  }

  function updateCompany(id: string, partial: Partial<Omit<Company, 'people' | 'id'>>) {
    setCompanies(prev => prev.map(o => o.id === id ? { ...o, ...partial } : o))
  }

  function updatePerson(companyId: string, personId: string, partial: Partial<Omit<LeadPerson, 'id'>>) {
    setCompanies(prev => prev.map(o => {
      if (o.id !== companyId) return o
      return { ...o, people: o.people.map(p => p.id === personId ? { ...p, ...partial } : p) }
    }))
  }

  async function queueResearchCompanies(ids: string[]): Promise<void> {
    // Optimistic update
    setCompanies(prev => prev.map(o =>
      ids.includes(o.id) && o.enrichStatus === 'not_enriched'
        ? { ...o, enrichStatus: 'researching' }
        : o
    ))
    await queueResearch(ids)
  }

  async function queueEnrichCompanies(ids: string[]): Promise<void> {
    // Optimistic update
    setCompanies(prev => prev.map(o =>
      ids.includes(o.id) && o.enrichStatus === 'researched'
        ? { ...o, enrichStatus: 'enriching' }
        : o
    ))
    await queueEnrich(ids)
  }

  function enrollPeopleInCampaign(personIds: string[], campaignId: string) {
    // Optimistic update
    setCompanies(prev => prev.map(o => ({
      ...o,
      people: o.people.map(p => {
        if (!personIds.includes(p.id) || p.campaignIds.includes(campaignId)) return p
        return { ...p, campaignIds: [...p.campaignIds, campaignId] }
      }),
    })))
    enrollPeople(campaignId, personIds).catch(err => console.error('Enroll failed:', err))
  }

  function removePersonFromCampaign(personId: string, campaignId: string) {
    // Optimistic update
    setCompanies(prev => prev.map(o => ({
      ...o,
      people: o.people.map(p => {
        if (p.id !== personId) return p
        return { ...p, campaignIds: p.campaignIds.filter(id => id !== campaignId) }
      }),
    })))
    unenrollPerson(campaignId, personId).catch(err => console.error('Unenroll failed:', err))
  }

  async function addCampaign(c: Omit<Campaign, 'id'>): Promise<Campaign> {
    const created = await createCampaign(c)
    setCampaigns(prev => [...prev, created])
    return created
  }

  function updateCampaign(c: Campaign) {
    setCampaigns(prev => prev.map(o => o.id === c.id ? c : o))
    saveCampaign(c).catch(err => console.error('Campaign save failed:', err))
  }

  function addAccount(account: EmailAccount) {
    setAccounts(prev => [...prev, account])
  }

  async function toggleAccountStatus(account: EmailAccount) {
    const next = account.status === 'paused' ? 'active' : 'paused'
    const updated = await patchAccountStatus(account.id, next)
    setAccounts(prev => prev.map(o => o.id === account.id ? updated : o))
  }

  async function removeAccount(id: string) {
    await deleteAccount(id)
    setAccounts(prev => prev.filter(o => o.id !== id))
  }

  function markRead(id: string) {
    setInbox(prev => prev.map(o => o.id === id ? { ...o, read: true } : o))
    markMessageRead(id)
  }

  return (
    <AppContext.Provider value={{
      companies, setCompanies, addFromImport, addFromCompanyImport,
      updateCompany, updatePerson,
      queueResearchCompanies, queueEnrichCompanies,
      enrollPeopleInCampaign, removePersonFromCampaign,
      campaigns, setCampaigns, addCampaign, updateCampaign,
      accounts, setAccounts, addAccount, toggleAccountStatus, removeAccount,
      warmupActivities, setWarmupActivities,
      inbox, setInbox, markRead,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppContextProvider')
  return ctx
}
