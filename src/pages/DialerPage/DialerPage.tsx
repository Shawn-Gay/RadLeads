import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { ExternalLink, Sparkles, Calendar, Phone, ChevronRight, ChevronDown, Link2, List, Search, MapPin, Star, Info, Users, Mail, X, UserPlus, Globe, RefreshCw, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { PhoneNumber } from '@/components/leads/PhoneNumber'
import { cn } from '@/lib/utils'
import { fillTokens } from '@/lib/tokens'
import { logCall } from '@/services/callLogs'
import { sendFollowUpEmail, getFollowUpEmailsByCompany } from '@/services/followUpEmails'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useAppContext } from '@/context/AppContext'
import { useDialerContext } from '@/context/DialerContext'
import { FOLLOW_UP_DEFAULT_ON } from '@/pages/LeadsPage/constants'
import type { CallOutcome, LeadPerson, FollowUpEmail } from '@/types'
import type { TokenData } from '@/lib/tokens'
import { DialerHeader }      from './DialerHeader'
import { QueueSidebar }      from './QueueSidebar'
import { CallHistoryCard }   from './CallHistoryCard'
import { EmailHistoryCard }  from './EmailHistoryCard'
import { ScriptCard }        from './ScriptCard'
import { OutcomeSection }    from './OutcomeSection'
import { ResearchChip }      from './ResearchChip'
import { SessionTimer }      from './SessionTimer'
import { EnrichBadge }       from '@/pages/LeadsPage/EnrichBadge'

type Phase = 'ready' | 'outcome'

export function DialerPage() {
  const navigate = useNavigate()
  const { dialerCompany, dialerMode } = useDialerContext()

  useEffect(() => {
    if (!dialerMode) navigate({ to: '/leads' })
  }, [dialerMode, navigate])

  if (!dialerMode) return null
  return dialerCompany ? <DialerPageContent /> : <DialerEmptyState />
}

function DialerEmptyState() {
  const { assignedCompanies, dialerExit, setShowAssignModal } = useDialerContext()
  const hasAssigned = assignedCompanies.length > 0
  const [queueOpen, setQueueOpen] = useState(false)
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
        <span className="text-sm font-semibold text-foreground">Dialer</span>
        <button
          onClick={() => setQueueOpen(v => !v)}
          className="p-1 rounded hover:bg-muted text-muted-foreground md:hidden"
          title="Toggle queue"
        >
          <List className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={dialerExit}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
          title="Exit dialer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <SessionTimer />
      <div className="flex-1 flex overflow-hidden relative">
        {queueOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setQueueOpen(false)}
          />
        )}
        <QueueSidebar open={queueOpen} onClose={() => setQueueOpen(false)} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Phone className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {hasAssigned ? 'Nothing due right now' : 'No leads assigned'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasAssigned
                ? 'All your leads are scheduled for later or closed. Check "All" in the sidebar to see everything, or pick one up from the Leads page.'
                : 'Assign leads to start dialing, or browse the Leads page and open a record directly.'}
            </p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              <UserPlus className="h-4 w-4" />
              Assign Leads
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DialerPageContent() {
  const {
    dialerCompany, dialerPersonId,
    callLogsByCompany, refreshCallLogs,
    dialerNext, dialerExit, handleDropCompany,
    setShowIdentityModal, setShowAssignModal,
    callSession, bumpSessionCount,
  } = useDialerContext()
  const [queueOpen, setQueueOpen] = useState(false)
  const { accounts, scripts, currentScript, selectScriptForCurrentDialer, editScript, emailTemplates, currentDialer, refreshCompany, updateCompany, queueResearchCompanies, queueEnrichCompanies, queueFindDecisionMakerCompanies } = useAppContext()

  // Guaranteed non-null by parent guard
  const company = dialerCompany!

  const isEnrichInProgress = company.enrichStatus === 'researching' || company.enrichStatus === 'enriching' || company.enrichStatus === 'finding_decision_maker'
  const hasDecisionMaker = company.people.some(o => /owner|founder|president|ceo|coo|principal|proprietor/i.test(o.title))

  function handleResearch() {
    queueResearchCompanies([company.id]).catch(() => updateCompany(company.id, { enrichStatus: 'not_enriched' }))
  }

  function handleEnrich() {
    queueEnrichCompanies([company.id]).catch(() => updateCompany(company.id, { enrichStatus: 'researched' }))
  }

  function handleFindDecisionMaker() {
    const prev = company.enrichStatus
    queueFindDecisionMakerCompanies([company.id]).catch(() => updateCompany(company.id, { enrichStatus: prev }))
  }

  const initialIdx = company.people.findIndex(o => o.id === dialerPersonId)

  const [personIndex, setPersonIndex]           = useState(Math.max(0, initialIdx))
  const [phase, setPhase]                       = useState<Phase>('ready')
  const [outcome, setOutcome]                   = useState<CallOutcome | null>(null)
  const [notes, setNotes]                       = useState('')
  const [callbackAt, setCallbackAt]             = useState('')
  const [saving, setSaving]                     = useState(false)
  const [lastCalledTarget, setLastCalledTarget] = useState<'company' | 'person' | null>(null)
  const [lastCallLogId, setLastCallLogId]       = useState<string | null>(null)
  const [showDetails, setShowDetails]           = useState(false)

  const [sendFollowUp, setSendFollowUp]         = useState(false)
  const [editingEmail, setEditingEmail]         = useState(false)
  const [emailSubject, setEmailSubject]         = useState('')
  const [emailBody, setEmailBody]               = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [fromAccountId, setFromAccountId]       = useLocalStorage<string>('radleads:followUpFromAccountId', '')

  const sendableAccounts   = accounts.filter(o => o.status === 'active' || o.status === 'warming')
  const selectedFromAccount = sendableAccounts.find(o => o.id === fromAccountId) ?? sendableAccounts[0]

  const person: LeadPerson | undefined = company.people[personIndex]
  const primaryEmail   = person?.emails.find(o => o.isPrimary) ?? person?.emails[0]
  const followUpToAddr = primaryEmail?.address ?? company.email ?? null

  const companyLogs  = callLogsByCompany.get(company.id) ?? []
  const lastCall     = companyLogs[0] ?? null

  const [followUpEmails, setFollowUpEmails] = useState<FollowUpEmail[]>([])
  useEffect(() => {
    getFollowUpEmailsByCompany(company.id).then(setFollowUpEmails).catch(() => {})
  }, [company.id])

  // Reset per-call state when company changes
  useEffect(() => {
    setPhase('ready')
    setOutcome(null)
    setNotes('')
    setCallbackAt('')
    setLastCalledTarget(null)
    setSendFollowUp(false)
    setEditingEmail(false)
    setLastCallLogId(null)
    setShowDetails(false)
    const idx = company.people.findIndex(o => o.id === dialerPersonId)
    setPersonIndex(Math.max(0, idx))
  }, [company.id])

  useEffect(() => {
    if (phase === 'outcome') return
    setOutcome(null)
    setNotes('')
    setCallbackAt('')
    setSendFollowUp(false)
  }, [personIndex])

  const templatesForOutcome = outcome
    ? emailTemplates.filter(t => !t.isArchived && t.outcomeAssignments.some(a => a.outcome === outcome))
    : []
  const selectedTemplate = selectedTemplateId
    ? emailTemplates.find(o => o.id === selectedTemplateId) ?? null
    : null

  useEffect(() => {
    if (!outcome) { setSelectedTemplateId(null); return }
    const candidates = emailTemplates.filter(t => !t.isArchived && t.outcomeAssignments.some(a => a.outcome === outcome))
    const defaultTpl = candidates.find(t => t.outcomeAssignments.find(a => a.outcome === outcome)?.isDefault)
    const picked = defaultTpl ?? candidates[0] ?? null
    setSelectedTemplateId(picked?.id ?? null)

    const hasBody = !!picked || !!person?.followUpEmailTemplate
    const isAutoOutcome = FOLLOW_UP_DEFAULT_ON.has(outcome)
    setSendFollowUp(hasBody && isAutoOutcome && !!followUpToAddr)

    if (picked) {
      setEmailSubject(picked.subject)
      setEmailBody(picked.body)
    } else if (person?.followUpEmailTemplate) {
      setEmailSubject('')
      setEmailBody(person.followUpEmailTemplate)
    } else {
      setEmailSubject('')
      setEmailBody('')
    }
    setEditingEmail(false)
  }, [outcome])

  function handleTemplateChange(id: string) {
    setSelectedTemplateId(id || null)
    const t = emailTemplates.find(o => o.id === id)
    if (t) { setEmailSubject(t.subject); setEmailBody(t.body) }
  }

  function buildTokenData(): TokenData {
    return {
      firstName:    person?.firstName,
      lastName:     person?.lastName,
      company:      company.name,
      city:         person?.city,
      icebreaker:   person?.icebreaker,
      painPoint:    person?.painPoint,
      title:        person?.title,
      phone:        person?.phone ?? undefined,
      companyPhone: company.phone ?? undefined,
      meetingLink:  company.meetingLink ?? undefined,
      senderFirstName:    selectedFromAccount?.firstName ?? undefined,
      senderLastName:     selectedFromAccount?.lastName ?? undefined,
      senderTitle:        selectedFromAccount?.title ?? undefined,
      senderCompany:      selectedFromAccount?.companyName ?? undefined,
      senderPhone:        selectedFromAccount?.phone ?? undefined,
      senderCalendarLink: selectedFromAccount?.calendarLink ?? undefined,
      senderSignature:    selectedFromAccount?.signature ?? undefined,
    }
  }

  function handleCall(target: 'company' | 'person') {
    const phone = target === 'company' ? company.phone : person?.phone
    if (!phone) return
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'] })
    window.location.href = `tel:${phone}`
    setPhase('outcome')
    setLastCalledTarget(target)
  }

  async function handleSave(advance: boolean) {
    if (!outcome || !lastCalledTarget) return
    setSaving(true)
    try {
      const calledPhone = lastCalledTarget === 'company' ? company.phone! : person!.phone!
      // datetime-local is wall-clock with no offset — convert to UTC ISO so Postgres timestamptz accepts it
      const callbackIso = callbackAt ? new Date(callbackAt).toISOString() : undefined
      const saved = await logCall({
        personId:      lastCalledTarget === 'person' ? person!.id : undefined,
        companyId:     company.id,
        calledPhone,
        outcome,
        notes:         notes.trim() || undefined,
        callbackAt:    callbackIso,
        scriptId:      currentScript?.id,
        dialerId:      currentDialer?.id,
        callSessionId: callSession?.id,
      })
      setLastCallLogId(saved.id)
      bumpSessionCount()

      if (sendFollowUp && followUpToAddr && selectedFromAccount) {
        const tokenData = buildTokenData()
        sendFollowUpEmail({
          personId:        person?.id,
          companyId:       company.id,
          fromAccountId:   selectedFromAccount.id,
          toEmail:         followUpToAddr,
          subject:         fillTokens(emailSubject, tokenData),
          body:            fillTokens(emailBody, tokenData),
          emailTemplateId: selectedTemplateId ?? undefined,
        }).catch(err => console.error('Follow-up email failed:', err))
      }
    } finally {
      setSaving(false)
    }
    refreshCallLogs()
    refreshCompany(company.id)
    getFollowUpEmailsByCompany(company.id).then(setFollowUpEmails).catch(() => {})
    if (advance) {
      dialerNext()
    } else {
      setPhase('ready')
      setOutcome(null)
      setNotes('')
      setCallbackAt('')
      setSendFollowUp(false)
      setEditingEmail(false)
      setLastCalledTarget(null)
    }
  }

  const tokenData = buildTokenData()

  return (
    <div className="flex flex-col h-full">
      <DialerHeader
        company={company}
        lastCall={lastCall}
        currentDialer={currentDialer}
        companyId={company.id}
        onExit={dialerExit}
        onToggleQueue={() => setQueueOpen(v => !v)}
        onSwitchDialer={() => setShowIdentityModal(true)}
        onAssignMore={() => setShowAssignModal(true)}
        onDrop={handleDropCompany}
      />
      <SessionTimer />

      <div className="flex-1 flex overflow-hidden relative">
        {queueOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setQueueOpen(false)}
          />
        )}
        <QueueSidebar open={queueOpen} onClose={() => setQueueOpen(false)} />
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 py-4 sm:px-6 sm:py-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* Company + Decision Maker card */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <a
                  href={`https://${company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                >
                  {company.domain}
                </a>
                <ExternalLink className="h-3 w-3 shrink-0 text-blue-400 dark:text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">{company.name}</p>

              <div className="flex items-center gap-2 mt-1.5 mb-3">
                <EnrichBadge status={company.enrichStatus} />
                {isEnrichInProgress ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : company.enrichStatus === 'not_enriched' || company.enrichStatus === 'research_failed' ? (
                  <button
                    onClick={handleResearch}
                    className="flex items-center gap-1 text-[10px] font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 px-1.5 py-1 rounded transition-colors"
                  >
                    <Globe className="h-3 w-3" /> Research
                  </button>
                ) : company.enrichStatus === 'researched' ? (
                  <button
                    onClick={handleEnrich}
                    className="flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950 px-1.5 py-1 rounded transition-colors"
                  >
                    <Sparkles className="h-3 w-3" /> Enrich
                  </button>
                ) : company.enrichStatus === 'enriched' ? (
                  !hasDecisionMaker ? (
                    <button
                      onClick={handleFindDecisionMaker}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 px-1.5 py-1 rounded transition-colors"
                    >
                      <Search className="h-3 w-3" /> Find Owner
                    </button>
                  ) : (
                    <button
                      onClick={handleResearch}
                      title="Re-research"
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )
                ) : company.enrichStatus === 'serper_failed' ? (
                  <button
                    onClick={handleFindDecisionMaker}
                    className="flex items-center gap-1 text-[10px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 px-1.5 py-1 rounded transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <ResearchChip href={`https://www.google.com/search?q=${encodeURIComponent(`${company.name} ${company.domain} reviews`)}`} icon={<Star className="h-3 w-3" />} label="Reviews" title="Google reviews + search" />
                <ResearchChip href={`https://www.google.com/maps/search/${encodeURIComponent(company.name)}`} icon={<MapPin className="h-3 w-3" />} label="Maps" title="Google Maps" />
                <ResearchChip href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`} icon={<Link2 className="h-3 w-3" />} label="LinkedIn" title="LinkedIn company search" />
                <ResearchChip href={`https://www.google.com/search?q=${encodeURIComponent(`"${company.name}" owner OR CEO OR founder OR president site:linkedin.com`)}`} icon={<Search className="h-3 w-3" />} label="Find owner" title="Google search for decision makers on LinkedIn" />
                <ResearchChip href={`https://${company.domain}/about`} icon={<Info className="h-3 w-3" />} label="About" title="Company about page" />
                <ResearchChip href={`https://${company.domain}/team`} icon={<Users className="h-3 w-3" />} label="Team" title="Company team page" />
              </div>

              {(company.summary || company.recentNews) && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowDetails(v => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDetails && 'rotate-180')} />
                    {showDetails ? 'Hide details' : 'Show summary & news'}
                  </button>

                  {showDetails && (
                    <div className="mt-3 space-y-3">
                      {company.summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{company.summary}</p>
                      )}
                      {company.recentNews && (
                        <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/30 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Recent News</span>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed">{company.recentNews}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {company.meetingLink && (
                <a
                  href={company.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold">Book Meeting</span>
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )}

              {company.phone && (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 mb-4">
                  <PhoneNumber phone={company.phone} size="md" iconColor="text-emerald-600" asLink={false} />
                  <button
                    onClick={() => handleCall('company')}
                    disabled={phase === 'outcome'}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <Phone className="h-3 w-3" /> Call Company
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Decision Maker
                </label>

                {company.people.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No contacts found for this company.</p>
                ) : (
                  <>
                    <select
                      value={personIndex}
                      onChange={e => setPersonIndex(Number(e.target.value))}
                      className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                    >
                      {company.people.map((o, i) => (
                        <option key={o.id} value={i}>
                          {o.firstName} {o.lastName}{o.title ? ` — ${o.title}` : ''}
                        </option>
                      ))}
                    </select>

                    {person && (
                      <div className="rounded-lg bg-muted/50 border border-border p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold shrink-0">
                            {person.firstName[0]}{person.lastName?.[0] ?? ''}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-snug">
                              {person.firstName} {person.lastName}
                            </p>
                            {person.title && <p className="text-xs text-muted-foreground truncate">{person.title}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <ResearchChip
                            href={person.linkedinUrl ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${person.firstName} ${person.lastName} ${company.name}`)}`}
                            icon={<Link2 className="h-3 w-3" />}
                            label={person.linkedinUrl ? 'Profile' : 'Find LinkedIn'}
                            title={person.linkedinUrl ? 'LinkedIn profile' : 'LinkedIn people search'}
                          />
                          <ResearchChip
                            href={`https://www.google.com/search?q=${encodeURIComponent(`"${person.firstName} ${person.lastName}" "${company.name}"`)}`}
                            icon={<Search className="h-3 w-3" />}
                            label="Google"
                            title="Google search for this person at this company"
                          />
                          {primaryEmail && (
                            <ResearchChip
                              href={`https://www.google.com/search?q=${encodeURIComponent(primaryEmail.address)}`}
                              icon={<Mail className="h-3 w-3" />}
                              label="Email"
                              title="Search by email address"
                            />
                          )}
                        </div>

                        {person.phone ? (
                          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                            <PhoneNumber phone={person.phone} size="md" iconColor="text-blue-600" asLink={false} />
                            <button
                              onClick={() => handleCall('person')}
                              disabled={phase === 'outcome'}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                            >
                              <Phone className="h-3 w-3" /> Call Person
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No phone number for this contact.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {phase === 'outcome' && (
              <OutcomeSection
                outcome={outcome}
                onOutcomeChange={setOutcome}
                callbackAt={callbackAt}
                onCallbackAtChange={setCallbackAt}
                notes={notes}
                onNotesChange={setNotes}
                followUpToAddress={followUpToAddr}
                primaryEmailExists={!!primaryEmail}
                sendFollowUp={sendFollowUp}
                onToggleSendFollowUp={() => setSendFollowUp(v => !v)}
                editingEmail={editingEmail}
                onToggleEditingEmail={() => setEditingEmail(v => !v)}
                emailSubject={emailSubject}
                onEmailSubjectChange={setEmailSubject}
                emailBody={emailBody}
                onEmailBodyChange={setEmailBody}
                selectedTemplateId={selectedTemplateId}
                templatesForOutcome={templatesForOutcome}
                selectedTemplate={selectedTemplate}
                onTemplateChange={handleTemplateChange}
                sendableAccounts={sendableAccounts}
                selectedFromAccount={selectedFromAccount}
                onFromAccountIdChange={setFromAccountId}
                tokenData={tokenData}
                saving={saving}
                onSkip={dialerNext}
                onSave={() => handleSave(false)}
                onSaveAndNext={() => handleSave(true)}
              />
            )}

            <CallHistoryCard callLogs={companyLogs} onRefresh={refreshCallLogs} />
            <EmailHistoryCard emails={followUpEmails} />

            {!company.phone && company.people.every(o => !o.phone) && phase === 'ready' && (
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">No phone numbers available for this company.</p>
                <button
                  onClick={dialerNext}
                  className="px-6 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <ScriptCard
              scripts={scripts}
              currentDialer={currentDialer}
              currentScript={currentScript}
              tokenData={tokenData}
              lastCallLogId={lastCallLogId}
              selectScriptForCurrentDialer={selectScriptForCurrentDialer}
              editScript={editScript}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
