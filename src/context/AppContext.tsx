import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Company, LeadPerson, Campaign, EmailAccount, WarmupActivity, WarmupBatch, InboxMessage, ImportPersonInput, AccountProvider } from '@/types'
import { getLeads } from '@/services/leads'
import { getCampaigns } from '@/services/campaigns'
import { getAccounts, getWarmupActivities, getWarmupBatches } from '@/services/accounts'
import { getInbox } from '@/services/inbox'

interface AppContextValue {
  companies: Company[]
  addFromImport: (people: ImportPersonInput[]) => void
  updateCompany: (id: string, partial: Partial<Omit<Company, 'people' | 'id'>>) => void
  updatePerson: (companyId: string, personId: string, partial: Partial<Omit<LeadPerson, 'id'>>) => void
  addPersonToCampaign: (personId: string, campaignId: number) => void
  removePersonFromCampaign: (personId: string, campaignId: number) => void
  campaigns: Campaign[]
  addCampaign: (c: Omit<Campaign, 'id'>) => void
  updateCampaign: (c: Campaign) => void
  accounts: EmailAccount[]
  addAccount: (email: string, provider: AccountProvider, dailyLimit: number) => void
  updateAccount: (id: number, partial: Partial<EmailAccount>) => void
  warmupActivities: WarmupActivity[]
  warmupBatches: WarmupBatch[]
  saveBatch: (batchId: string | null, name: string, accountIds: number[]) => void
  deleteBatch: (batchId: string) => void
  inbox: InboxMessage[]
  markRead: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

let companyCounter = 100
let personCounter = 100

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [warmupActivities, setWarmupActivities] = useState<WarmupActivity[]>([])
  const [warmupBatches, setWarmupBatches] = useState<WarmupBatch[]>([])
  const [inbox, setInbox] = useState<InboxMessage[]>([])

  useEffect(() => {
    getLeads().then(setCompanies)
    getCampaigns().then(setCampaigns)
    getAccounts().then(setAccounts)
    getWarmupActivities().then(setWarmupActivities)
    getWarmupBatches().then(setWarmupBatches)
    getInbox().then(setInbox)
  }, [])

  // Smart merge: groups by domain, deduplicates by email address
  function addFromImport(people: ImportPersonInput[]) {
    setCompanies(prev => {
      // Shallow-clone so we can safely mutate people arrays
      const next = prev.map(o => ({ ...o, people: [...o.people] }))

      for (const input of people) {
        const domain = input.domain.toLowerCase().trim()
        let company = next.find(o => o.domain === domain)
        if (!company) {
          company = {
            id: `c${++companyCounter}`,
            domain,
            name: input.companyName || domain,
            enrichStatus: 'not_enriched',
            people: [],
          }
          next.push(company)
        }

        const emailExists = company.people.some(p =>
          p.emails.some(e => e.address.toLowerCase() === input.email.toLowerCase())
        )
        if (!emailExists) {
          company.people.push({
            id: `p${++personCounter}`,
            firstName: input.firstName,
            lastName: input.lastName,
            title: input.title ?? '',
            phone: input.phone ?? null,
            city: input.city,
            linkedinUrl: input.linkedinUrl,
            emails: [{ address: input.email, source: 'csv', isPrimary: true, status: 'unknown' }],
            campaignIds: [],
          })
        }
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

  function addPersonToCampaign(personId: string, campaignId: number) {
    setCompanies(prev => prev.map(o => ({
      ...o,
      people: o.people.map(p => {
        if (p.id !== personId || p.campaignIds.includes(campaignId)) return p
        return { ...p, campaignIds: [...p.campaignIds, campaignId] }
      }),
    })))
  }

  function removePersonFromCampaign(personId: string, campaignId: number) {
    setCompanies(prev => prev.map(o => ({
      ...o,
      people: o.people.map(p => {
        if (p.id !== personId) return p
        return { ...p, campaignIds: p.campaignIds.filter(id => id !== campaignId) }
      }),
    })))
  }

  function addCampaign(c: Omit<Campaign, 'id'>) {
    setCampaigns(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(o => o.id)) + 1 : 1
      return [...prev, { ...c, id: nextId }]
    })
  }

  function updateCampaign(c: Campaign) {
    setCampaigns(prev => prev.map(o => o.id === c.id ? c : o))
  }

  function addAccount(email: string, provider: AccountProvider, dailyLimit: number) {
    setAccounts(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(o => o.id)) + 1 : 1
      return [...prev, {
        id: nextId,
        email,
        provider,
        status: 'warming',
        health: null,
        sentToday: 0,
        dailyLimit,
        warmupDay: 1,
        warmupTotalDays: 30,
        warmupBatchId: null,
      }]
    })
  }

  function updateAccount(id: number, partial: Partial<EmailAccount>) {
    setAccounts(prev => prev.map(o => o.id === id ? { ...o, ...partial } : o))
  }

  function saveBatch(batchId: string | null, name: string, accountIds: number[]) {
    const id = batchId ?? `batch-${Date.now()}`
    setWarmupBatches(prev => {
      const exists = prev.some(o => o.id === id)
      if (exists) return prev.map(o => o.id === id ? { ...o, name } : o)
      return [...prev, { id, name, createdAt: new Date().toISOString() }]
    })
    setAccounts(prev => prev.map(o => {
      const inBatch = accountIds.includes(o.id)
      if (inBatch) return { ...o, warmupBatchId: id }
      if (o.warmupBatchId === id) return { ...o, warmupBatchId: null }
      return o
    }))
  }

  function deleteBatch(batchId: string) {
    setWarmupBatches(prev => prev.filter(o => o.id !== batchId))
    setAccounts(prev => prev.map(o =>
      o.warmupBatchId === batchId ? { ...o, warmupBatchId: null } : o
    ))
  }

  function markRead(id: number) {
    setInbox(prev => prev.map(o => o.id === id ? { ...o, read: true } : o))
  }

  return (
    <AppContext.Provider value={{
      companies, addFromImport, updateCompany, updatePerson,
      addPersonToCampaign, removePersonFromCampaign,
      campaigns, addCampaign, updateCampaign,
      accounts, addAccount, updateAccount,
      warmupActivities,
      warmupBatches, saveBatch, deleteBatch,
      inbox, markRead,
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
