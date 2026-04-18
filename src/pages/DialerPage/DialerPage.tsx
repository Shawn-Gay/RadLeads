import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { ExternalLink, Sparkles, Calendar, Phone, ChevronRight, Link2, Search, MapPin, Star, Info, Users, Mail } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { PhoneNumber } from '@/components/leads/PhoneNumber'
import { fillTokens } from '@/lib/tokens'
import { logCall } from '@/services/callLogs'
import { sendFollowUpEmail } from '@/services/followUpEmails'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useAppContext } from '@/context/AppContext'
import { useDialerContext } from '@/context/DialerContext'
import { FOLLOW_UP_DEFAULT_ON } from '@/pages/LeadsPage/constants'
import type { CallOutcome, LeadPerson } from '@/types'
import type { TokenData } from '@/lib/tokens'
import { DialerHeader }      from './DialerHeader'
import { CallHistoryCard }   from './CallHistoryCard'
import { ScriptCard }        from './ScriptCard'
import { ObjectionPlaybook } from './ObjectionPlaybook'
import { OutcomeSection }    from './OutcomeSection'
import { ResearchChip }      from './ResearchChip'

type Phase = 'ready' | 'outcome'

export function DialerPage() {
  const navigate = useNavigate()
  const { dialerCompany } = useDialerContext()

  useEffect(() => {
    if (!dialerCompany) navigate({ to: '/leads' })
  }, [dialerCompany, navigate])

  if (!dialerCompany) return null
  return <DialerPageContent />
}

function DialerPageContent() {
  const {
    dialerCompany, dialerIndex, dialerQueue, dialerPersonId,
    callLogsByCompany, scoreByCompany, refreshCallLogs,
    dialerPrev, dialerNext, dialerNextCold, dialerExit, handleDropCompany,
    setShowIdentityModal, setShowAssignModal,
  } = useDialerContext()
  const { accounts, scripts, currentScript, selectScriptForCurrentDialer, editScript, emailTemplates, currentDialer } = useAppContext()

  // Guaranteed non-null by parent guard
  const company = dialerCompany!

  const initialIdx = company.people.findIndex(o => o.id === dialerPersonId)

  const [personIndex, setPersonIndex]           = useState(Math.max(0, initialIdx))
  const [phase, setPhase]                       = useState<Phase>('ready')
  const [outcome, setOutcome]                   = useState<CallOutcome | null>(null)
  const [notes, setNotes]                       = useState('')
  const [callbackAt, setCallbackAt]             = useState('')
  const [saving, setSaving]                     = useState(false)
  const [lastCalledTarget, setLastCalledTarget] = useState<'company' | 'person' | null>(null)
  const [lastCallLogId, setLastCallLogId]       = useState<string | null>(null)

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
  const score        = scoreByCompany.get(company.id) ?? 0
  const attemptCount = companyLogs.length

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
      const saved = await logCall({
        personId:   lastCalledTarget === 'person' ? person!.id : undefined,
        companyId:  company.id,
        calledPhone,
        outcome,
        notes:      notes.trim() || undefined,
        callbackAt: outcome === 'CallBack' && callbackAt ? callbackAt : undefined,
        scriptId:   currentScript?.id,
        dialerId:   currentDialer?.id,
      })
      setLastCallLogId(saved.id)

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
        index={dialerIndex ?? 0}
        total={dialerQueue.length}
        score={score}
        attemptCount={attemptCount}
        currentDialer={currentDialer}
        companyId={company.id}
        onExit={dialerExit}
        onPrev={dialerPrev}
        onNext={dialerNext}
        onNextCold={dialerNextCold}
        onSwitchDialer={() => setShowIdentityModal(true)}
        onAssignMore={() => setShowAssignModal(true)}
        onDrop={handleDropCompany}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* Company card */}
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
              <p className="text-xs text-muted-foreground mb-3">{company.name}</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <ResearchChip href={`https://www.google.com/search?q=${encodeURIComponent(`${company.name} ${company.domain} reviews`)}`} icon={<Star className="h-3 w-3" />} label="Reviews" title="Google reviews + search" />
                <ResearchChip href={`https://www.google.com/maps/search/${encodeURIComponent(company.name)}`} icon={<MapPin className="h-3 w-3" />} label="Maps" title="Google Maps" />
                <ResearchChip href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`} icon={<Link2 className="h-3 w-3" />} label="LinkedIn" title="LinkedIn company search" />
                <ResearchChip href={`https://www.google.com/search?q=${encodeURIComponent(`"${company.name}" owner OR CEO OR founder OR president site:linkedin.com`)}`} icon={<Search className="h-3 w-3" />} label="Find owner" title="Google search for decision makers on LinkedIn" />
                <ResearchChip href={`https://${company.domain}/about`} icon={<Info className="h-3 w-3" />} label="About" title="Company about page" />
                <ResearchChip href={`https://${company.domain}/team`} icon={<Users className="h-3 w-3" />} label="Team" title="Company team page" />
              </div>

              {company.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{company.summary}</p>
              )}

              {company.recentNews && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/30 p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Recent News</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{company.recentNews}</p>
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
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
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
            </div>

            {/* Decision Maker */}
            <div className="rounded-xl border border-border bg-card p-5">
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

            <CallHistoryCard callLogs={companyLogs} />

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
            <ObjectionPlaybook tokenData={tokenData} />
          </div>
        </div>
      </div>
    </div>
  )
}
