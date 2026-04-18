import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Company, Dialer, DialDisposition, LeadPerson, Campaign, EmailAccount, SenderPersonaInput, WarmupActivity, InboxMessage, ImportPersonInput, ImportCompanyInput, Script, EmailTemplate, CallOutcome } from '@/types'
import { getLeads, importPeople, importCompanies, queueResearch, queueEnrich, assignLeads, claimLead, dropLead } from '@/services/leads'
import { getDialers, createDialer } from '@/services/dialers'
import { getCampaigns, createCampaign, saveCampaign, enrollPeople, unenrollPerson } from '@/services/campaigns'
import { getAccounts, getWarmupActivities, patchAccountStatus, deleteAccount, updateSenderInfo } from '@/services/accounts'
import { getInbox, markMessageRead } from '@/services/inbox'
import { getScripts, createScript as apiCreateScript, updateScript as apiUpdateScript, archiveScript as apiArchiveScript, deleteScript as apiDeleteScript, setDialerSelectedScript } from '@/services/scripts'
import {
  getEmailTemplates,
  createEmailTemplate as apiCreateEmailTemplate,
  updateEmailTemplate as apiUpdateEmailTemplate,
  archiveEmailTemplate as apiArchiveEmailTemplate,
  deleteEmailTemplate as apiDeleteEmailTemplate,
  assignEmailTemplateOutcome as apiAssignEmailTemplateOutcome,
  unassignEmailTemplateOutcome as apiUnassignEmailTemplateOutcome,
} from '@/services/emailTemplates'

const DIALER_STORAGE_KEY = 'radleads:currentDialerId'

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
  assignCompaniesToDialer: (dialerId: string, count: number) => Promise<void>
  claimCompanyForDialer: (companyId: string, dialerId: string) => Promise<Company>
  dropCompany: (companyId: string, disposition: DialDisposition) => Promise<void>
  campaigns: Campaign[]
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>
  addCampaign: (c: Omit<Campaign, 'id'>) => Promise<Campaign>
  updateCampaign: (c: Campaign) => void
  accounts: EmailAccount[]
  setAccounts: React.Dispatch<React.SetStateAction<EmailAccount[]>>
  addAccount: (account: EmailAccount) => void
  toggleAccountStatus: (account: EmailAccount) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  updateAccountSenderInfo: (id: string, persona: SenderPersonaInput) => Promise<void>
  warmupActivities: WarmupActivity[]
  setWarmupActivities: React.Dispatch<React.SetStateAction<WarmupActivity[]>>
  inbox: InboxMessage[]
  setInbox: React.Dispatch<React.SetStateAction<InboxMessage[]>>
  markRead: (id: string) => void
  // Dialer identity
  dialers: Dialer[]
  currentDialer: Dialer | null
  setCurrentDialer: (dialer: Dialer | null) => void
  addDialer: (name: string) => Promise<Dialer>
  // Scripts
  scripts: Script[]
  currentScript: Script | null
  selectScriptForCurrentDialer: (scriptId: string | null) => Promise<void>
  addScript: (name: string, body: string) => Promise<Script>
  editScript: (id: string, name: string, body: string) => Promise<Script>
  archiveScript: (id: string, archived?: boolean) => Promise<void>
  removeScript: (id: string) => Promise<void>
  // Email Templates
  emailTemplates: EmailTemplate[]
  addEmailTemplate: (name: string, subject: string, body: string) => Promise<EmailTemplate>
  editEmailTemplate: (id: string, name: string, subject: string, body: string) => Promise<EmailTemplate>
  archiveEmailTemplate: (id: string, archived?: boolean) => Promise<void>
  removeEmailTemplate: (id: string) => Promise<void>
  assignEmailTemplateToOutcome: (id: string, outcome: CallOutcome, isDefault: boolean) => Promise<void>
  unassignEmailTemplateFromOutcome: (id: string, outcome: CallOutcome) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies]           = useState<Company[]>([])
  const [campaigns, setCampaigns]           = useState<Campaign[]>([])
  const [accounts, setAccounts]             = useState<EmailAccount[]>([])
  const [warmupActivities, setWarmupActivities] = useState<WarmupActivity[]>([])
  const [inbox, setInbox]                   = useState<InboxMessage[]>([])
  const [dialers, setDialers]               = useState<Dialer[]>([])
  const [currentDialer, setCurrentDialerState] = useState<Dialer | null>(() => null)
  const [scripts, setScripts]               = useState<Script[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])

  const currentScript = currentDialer?.selectedScriptId
    ? scripts.find(o => o.id === currentDialer.selectedScriptId) ?? null
    : null

  useEffect(() => {
    getLeads().then(setCompanies)
    getCampaigns().then(setCampaigns)
    getAccounts().then(setAccounts)
    getWarmupActivities().then(setWarmupActivities)
    getInbox().then(setInbox)
    getScripts().then(setScripts)
    getEmailTemplates().then(setEmailTemplates)
    getDialers().then(list => {
      setDialers(list)
      // Restore current dialer from localStorage
      const savedId = localStorage.getItem(DIALER_STORAGE_KEY)
      if (savedId) {
        const found = list.find(o => o.id === savedId)
        if (found) setCurrentDialerState(found)
      }
    })
  }, [])

  function setCurrentDialer(dialer: Dialer | null) {
    setCurrentDialerState(dialer)
    if (dialer) localStorage.setItem(DIALER_STORAGE_KEY, dialer.id)
    else localStorage.removeItem(DIALER_STORAGE_KEY)
  }

  async function addDialer(name: string): Promise<Dialer> {
    const dialer = await createDialer(name)
    setDialers(prev => [...prev, dialer])
    return dialer
  }

  async function selectScriptForCurrentDialer(scriptId: string | null): Promise<void> {
    if (!currentDialer) return
    const updated = await setDialerSelectedScript(currentDialer.id, scriptId)
    const next: Dialer = { ...currentDialer, selectedScriptId: updated.selectedScriptId }
    setCurrentDialerState(next)
    setDialers(prev => prev.map(o => o.id === next.id ? next : o))
  }

  async function addScript(name: string, body: string): Promise<Script> {
    const s = await apiCreateScript(name, body)
    setScripts(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))
    return s
  }

  async function editScript(id: string, name: string, body: string): Promise<Script> {
    const s = await apiUpdateScript(id, name, body)
    setScripts(prev => prev.map(o => o.id === id ? s : o))
    return s
  }

  async function archiveScript(id: string, archived = true): Promise<void> {
    const s = await apiArchiveScript(id, archived)
    setScripts(prev => prev.map(o => o.id === id ? s : o))
  }

  async function removeScript(id: string): Promise<void> {
    await apiDeleteScript(id)
    setScripts(prev => prev.filter(o => o.id !== id))
    if (currentDialer?.selectedScriptId === id) {
      const next: Dialer = { ...currentDialer, selectedScriptId: null }
      setCurrentDialerState(next)
      setDialers(prev => prev.map(o => o.id === next.id ? next : o))
    }
  }

  async function addEmailTemplate(name: string, subject: string, body: string): Promise<EmailTemplate> {
    const t = await apiCreateEmailTemplate(name, subject, body)
    setEmailTemplates(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
    return t
  }

  async function editEmailTemplate(id: string, name: string, subject: string, body: string): Promise<EmailTemplate> {
    const t = await apiUpdateEmailTemplate(id, name, subject, body)
    setEmailTemplates(prev => prev.map(o => o.id === id ? t : o))
    return t
  }

  async function archiveEmailTemplate(id: string, archived = true): Promise<void> {
    const t = await apiArchiveEmailTemplate(id, archived)
    setEmailTemplates(prev => prev.map(o => o.id === id ? t : o))
  }

  async function removeEmailTemplate(id: string): Promise<void> {
    await apiDeleteEmailTemplate(id)
    setEmailTemplates(prev => prev.filter(o => o.id !== id))
  }

  async function assignEmailTemplateToOutcome(id: string, outcome: CallOutcome, isDefault: boolean): Promise<void> {
    const updated = await apiAssignEmailTemplateOutcome(id, outcome, isDefault)
    // If marked default, refresh others for that outcome (server cleared their IsDefault)
    if (isDefault) {
      const fresh = await getEmailTemplates(true)
      setEmailTemplates(fresh)
    } else {
      setEmailTemplates(prev => prev.map(o => o.id === id ? updated : o))
    }
  }

  async function unassignEmailTemplateFromOutcome(id: string, outcome: CallOutcome): Promise<void> {
    const updated = await apiUnassignEmailTemplateOutcome(id, outcome)
    setEmailTemplates(prev => prev.map(o => o.id === id ? updated : o))
  }

  async function addFromImport(people: ImportPersonInput[]): Promise<void> {
    await importPeople(people)
    const all = await getLeads()
    setCompanies(all)
  }

  async function addFromCompanyImport(inputs: ImportCompanyInput[]): Promise<void> {
    await importCompanies(inputs)
    const all = await getLeads()
    setCompanies(all)
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

  async function assignCompaniesToDialer(dialerId: string, count: number): Promise<void> {
    const assigned = await assignLeads(dialerId, count)
    setCompanies(prev => {
      const map = new Map(assigned.map(o => [o.id, o]))
      return prev.map(o => map.has(o.id) ? map.get(o.id)! : o)
    })
  }

  async function claimCompanyForDialer(companyId: string, dialerId: string): Promise<Company> {
    const updated = await claimLead(companyId, dialerId)
    setCompanies(prev => prev.map(o => o.id === updated.id ? updated : o))
    return updated
  }

  async function dropCompany(companyId: string, disposition: DialDisposition): Promise<void> {
    await dropLead(companyId, disposition)
    setCompanies(prev => prev.map(o =>
      o.id === companyId
        ? { ...o, assignedToId: null, assignedAt: null, dialDisposition: disposition }
        : o
    ))
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

  async function updateAccountSenderInfo(id: string, persona: SenderPersonaInput) {
    const updated = await updateSenderInfo(id, persona)
    setAccounts(prev => prev.map(o => o.id === id ? updated : o))
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
      assignCompaniesToDialer, claimCompanyForDialer, dropCompany,
      campaigns, setCampaigns, addCampaign, updateCampaign,
      accounts, setAccounts, addAccount, toggleAccountStatus, removeAccount, updateAccountSenderInfo,
      warmupActivities, setWarmupActivities,
      inbox, setInbox, markRead,
      dialers, currentDialer, setCurrentDialer, addDialer,
      scripts, currentScript, selectScriptForCurrentDialer,
      addScript, editScript, archiveScript, removeScript,
      emailTemplates, addEmailTemplate, editEmailTemplate,
      archiveEmailTemplate, removeEmailTemplate,
      assignEmailTemplateToOutcome, unassignEmailTemplateFromOutcome,
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
