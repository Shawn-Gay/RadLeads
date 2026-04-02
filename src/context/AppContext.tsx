import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Lead, Campaign, EmailAccount, InboxMessage } from '@/types'
import { LEADS0, CAMPAIGNS0, ACCOUNTS0, INBOX0 } from '@/data/seed'

interface AppContextValue {
  leads: Lead[]
  addLeads: (leads: Omit<Lead, 'id' | 'status' | 'score' | 'lastTouched'>[]) => void
  updateLead: (id: number, partial: Partial<Lead>) => void
  campaigns: Campaign[]
  addCampaign: (c: Omit<Campaign, 'id'>) => void
  updateCampaign: (c: Campaign) => void
  accounts: EmailAccount[]
  updateAccount: (id: number, partial: Partial<EmailAccount>) => void
  inbox: InboxMessage[]
  markRead: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(LEADS0)
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS0)
  const [accounts, setAccounts] = useState<EmailAccount[]>(ACCOUNTS0)
  const [inbox, setInbox] = useState<InboxMessage[]>(INBOX0)

  function addLeads(newLeads: Omit<Lead, 'id' | 'status' | 'score' | 'lastTouched'>[]) {
    setLeads(prev => {
      let nextId = prev.length > 0 ? Math.max(...prev.map(o => o.id)) + 1 : 1
      const today = new Date().toISOString().slice(0, 10)
      const created: Lead[] = newLeads.map(o => ({
        ...o,
        id: nextId++,
        status: 'new',
        score: Math.floor(50 + Math.random() * 40),
        lastTouched: today,
      }))
      return [...prev, ...created]
    })
  }

  function updateLead(id: number, partial: Partial<Lead>) {
    setLeads(prev => prev.map(o => o.id === id ? { ...o, ...partial } : o))
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

  function updateAccount(id: number, partial: Partial<EmailAccount>) {
    setAccounts(prev => prev.map(o => o.id === id ? { ...o, ...partial } : o))
  }

  function markRead(id: number) {
    setInbox(prev => prev.map(o => o.id === id ? { ...o, read: true } : o))
  }

  return (
    <AppContext.Provider value={{
      leads, addLeads, updateLead,
      campaigns, addCampaign, updateCampaign,
      accounts, updateAccount,
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
