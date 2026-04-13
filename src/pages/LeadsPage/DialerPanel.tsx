import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import {
  Phone, ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Pencil, Eye, Copy,
  PhoneCall, Snowflake, Calendar, Sparkles, ChevronDown, Mail, MailCheck, MailX,
  Clock, Trash2, UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fillTokens, CALL_TOKEN_HINTS, EMAIL_TOKEN_HINTS } from '@/lib/tokens'
import { logCall } from '@/services/callLogs'
import { sendFollowUpEmail } from '@/services/followUpEmails'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useAppContext } from '@/context/AppContext'
import {
  CALL_OUTCOME_STYLES, CALL_OUTCOME_LABELS,
  DEFAULT_FOLLOW_UP_SUBJECT, DEFAULT_FOLLOW_UP_EMAIL, FOLLOW_UP_DEFAULT_ON,
  OBJECTION_PLAYBOOK,
} from './constants'
import type { Company, Dialer, DialDisposition, LeadPerson, CallOutcome, CallLog } from '@/types'
import type { TokenData } from '@/lib/tokens'

interface DialerPanelProps {
  company: Company
  index: number
  total: number
  initialPersonId: string | null
  callLogs: CallLog[]
  attemptCount: number
  score: number
  currentDialer: Dialer | null
  onPrev: () => void
  onNext: () => void
  onNextCold: () => void
  onExit: () => void
  onDrop: (companyId: string, disposition: DialDisposition) => void
  onSwitchDialer: () => void
  onCallLogged?: () => void
}

type Phase = 'ready' | 'outcome'

interface OutcomeOption {
  value: CallOutcome
  label: string
  color: string
}

const OUTCOMES: OutcomeOption[] = [
  { value: 'Connected',     label: 'Connected',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'Interested',    label: 'Interested!',    color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { value: 'CallBack',      label: 'Call Back',      color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  { value: 'LeftVoicemail', label: 'Left Voicemail', color: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
  { value: 'LeftMessage',   label: 'Left Message',   color: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' },
  { value: 'NoAnswer',      label: 'No Answer',      color: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { value: 'NotInterested', label: 'Not Interested', color: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
  { value: 'WrongNumber',   label: 'Wrong Number',   color: 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
]

const DEFAULT_SCRIPT = `Hi, is this {{firstName}}?

Great — this is Shawn from RadcoreAI. I came across {{company}} and had a quick question about how you're currently generating new leads for your business in {{city}}.

{{icebreaker}}

The reason I'm calling is we help companies like {{company}} build a consistent pipeline of qualified leads using AI-driven outreach — and I was curious if that's something you'd be open to exploring.

Would you have 15 minutes this week for a quick chat?`

export function DialerPanel({
  company, index, total, initialPersonId, callLogs, attemptCount, score,
  currentDialer, onPrev, onNext, onNextCold, onExit, onDrop, onSwitchDialer, onCallLogged,
}: DialerPanelProps) {
  const initialIdx = company.people.findIndex(o => o.id === initialPersonId)
  const [personIndex, setPersonIndex]           = useState(Math.max(0, initialIdx))
  const [phase, setPhase]                       = useState<Phase>('ready')
  const [outcome, setOutcome]                   = useState<CallOutcome | null>(null)
  const [notes, setNotes]                       = useState('')
  const [saving, setSaving]                     = useState(false)
  const [editingScript, setEditingScript]       = useState(false)
  const [lastCalledTarget, setLastCalledTarget] = useState<'company' | 'person' | null>(null)
  const [objectionsOpen, setObjectionsOpen]     = useState(false)

  // Callback scheduling
  const [callbackAt, setCallbackAt] = useState('')

  // Follow-up email state
  const [sendFollowUp, setSendFollowUp]         = useState(false)
  const [editingEmail, setEditingEmail]          = useState(false)
  const [emailSubject, setEmailSubject]          = useState('')
  const [emailBody, setEmailBody]                = useState('')

  const [script, setScript]                   = useLocalStorage('radleads:callScript', DEFAULT_SCRIPT)
  const [followUpTemplate, setFollowUpTemplate] = useLocalStorage('radleads:followUpEmail', DEFAULT_FOLLOW_UP_EMAIL)
  const [followUpSubjectTpl, setFollowUpSubjectTpl] = useLocalStorage('radleads:followUpSubject', DEFAULT_FOLLOW_UP_SUBJECT)
  const [fromAccountId, setFromAccountId]     = useLocalStorage<string>('radleads:followUpFromAccountId', '')

  const { accounts } = useAppContext()
  const sendableAccounts = accounts.filter(o => o.status === 'active' || o.status === 'warming')
  const selectedFromAccount =
    sendableAccounts.find(o => o.id === fromAccountId) ?? sendableAccounts[0]

  const person: LeadPerson | undefined = company.people[personIndex]
  const primaryEmail = person?.emails.find(o => o.isPrimary) ?? person?.emails[0]
  // Fallback to company generic email if person has no direct email
  const followUpToAddress = primaryEmail?.address ?? company.email ?? null

  // Reset when company changes
  useEffect(() => {
    setPhase('ready')
    setOutcome(null)
    setNotes('')
    setCallbackAt('')
    setLastCalledTarget(null)
    setSendFollowUp(false)
    setEditingEmail(false)
    const idx = company.people.findIndex(o => o.id === initialPersonId)
    setPersonIndex(Math.max(0, idx))
  }, [company.id])

  // Reset outcome when person changes within same company
  useEffect(() => {
    if (phase === 'outcome') return
    setOutcome(null)
    setNotes('')
    setCallbackAt('')
    setSendFollowUp(false)
  }, [personIndex])

  // When outcome changes, set follow-up defaults
  useEffect(() => {
    if (!outcome) return
    const shouldSend = FOLLOW_UP_DEFAULT_ON.has(outcome) && !!followUpToAddress
    setSendFollowUp(shouldSend)
    // Use person's enriched template if available, otherwise global template
    const bodyTpl = person?.followUpEmailTemplate ?? followUpTemplate
    setEmailBody(bodyTpl)
    setEmailSubject(followUpSubjectTpl)
    setEditingEmail(false)
  }, [outcome])

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

  function fireConfetti() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
    })
  }

  function handleCall(target: 'company' | 'person') {
    const phone = target === 'company' ? company.phone : person?.phone
    if (!phone) return
    fireConfetti()
    window.location.href = `tel:${phone}`
    setPhase('outcome')
    setLastCalledTarget(target)
  }

  async function handleSave(advance: boolean) {
    if (!outcome || !lastCalledTarget) return
    setSaving(true)
    try {
      const calledPhone = lastCalledTarget === 'company' ? company.phone! : person!.phone!
      await logCall({
        personId:    lastCalledTarget === 'person' ? person!.id : undefined,
        companyId:   company.id,
        calledPhone,
        outcome,
        notes: notes.trim() || undefined,
        callbackAt:  outcome === 'CallBack' && callbackAt ? callbackAt : undefined,
      })

      // Send follow-up email if toggled on
      if (sendFollowUp && followUpToAddress && selectedFromAccount) {
        const tokenData = buildTokenData()
        sendFollowUpEmail({
          personId:      person?.id,
          companyId:     company.id,
          fromAccountId: selectedFromAccount.id,
          toEmail:       followUpToAddress,
          subject:       fillTokens(emailSubject, tokenData),
          body:          fillTokens(emailBody, tokenData),
        }).catch(err => console.error('Follow-up email failed:', err))
      }
    } finally {
      setSaving(false)
    }
    onCallLogged?.()
    if (advance) {
      onNext()
    } else {
      // Stay on company. Reset outcome state, return to ready phase.
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
  const filledScript = fillTokens(script, tokenData)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Leads
          </button>

          {/* Score badge */}
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              score >= 80 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' :
              score >= 40 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
              'bg-muted text-muted-foreground'
            )}
            title="Lead priority score"
          >
            Score: {score}
          </span>

          {/* Attempt counter */}
          {attemptCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              Attempt #{attemptCount + 1}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Dialing as badge */}
          {currentDialer && (
            <button
              onClick={onSwitchDialer}
              title="Switch dialer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <UserCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{currentDialer.name}</span>
            </button>
          )}

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={onPrev}
            disabled={index <= 0}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>

          <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            {index + 1} / {total}
          </span>

          <button
            onClick={onNext}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={onNextCold}
            title="Skip to the next company with no calls"
            className="flex items-center gap-1.5 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Snowflake className="h-3.5 w-3.5" /> Next Cold
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Drop lead menu */}
          <DropMenu companyId={company.id} onDrop={onDrop} />
        </div>
      </div>

      {/* Main content — two columns */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN — Company & Calling */}
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

              {company.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{company.summary}</p>
              )}

              {/* Recent news */}
              {company.recentNews && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/30 p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Recent News</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{company.recentNews}</p>
                </div>
              )}

              {/* Meeting link */}
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

              {/* Company phone */}
              {company.phone && (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-mono font-medium text-foreground">{company.phone}</span>
                  </div>
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

                      {person.phone ? (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-mono font-medium text-foreground">{person.phone}</span>
                          </div>
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

            {/* Outcome section */}
            {phase === 'outcome' && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground mb-3">How did the call go?</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setOutcome(o.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                        o.color,
                        outcome === o.value && 'ring-2 ring-offset-1 ring-blue-500'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Callback date picker */}
                {outcome === 'CallBack' && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Call back:</span>
                    <input
                      type="datetime-local"
                      value={callbackAt}
                      onChange={e => setCallbackAt(e.target.value)}
                      className="flex-1 text-xs bg-transparent border-none focus:outline-none text-foreground"
                    />
                  </div>
                )}

                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes (optional)..."
                  rows={3}
                  className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground resize-none mb-4"
                />

                {/* Follow-up email */}
                {outcome && followUpToAddress && (
                  <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setSendFollowUp(!sendFollowUp)}
                        className="flex items-center gap-2 text-xs font-semibold"
                      >
                        {sendFollowUp
                          ? <MailCheck className="h-4 w-4 text-emerald-600" />
                          : <MailX className="h-4 w-4 text-muted-foreground" />
                        }
                        <span className={sendFollowUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>
                          Follow-up Email {sendFollowUp ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {sendFollowUp && (
                        <button
                          onClick={() => setEditingEmail(!editingEmail)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {editingEmail ? <><Eye className="h-3.5 w-3.5" /> Preview</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                        </button>
                      )}
                    </div>

                    {sendFollowUp && (
                      <div className="space-y-2">
                        {/* From account selector */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="shrink-0">From:</span>
                          {sendableAccounts.length === 0 ? (
                            <span className="text-[10px] italic text-amber-600 dark:text-amber-400">
                              No sender accounts — connect one in Accounts
                            </span>
                          ) : (
                            <select
                              value={selectedFromAccount?.id ?? ''}
                              onChange={e => setFromAccountId(e.target.value)}
                              className="flex-1 text-xs bg-muted border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                            >
                              {sendableAccounts.map(o => (
                                <option key={o.id} value={o.id}>{o.email}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>To: {followUpToAddress}</span>
                          {!primaryEmail && (
                            <span className="text-[10px] italic">(company fallback)</span>
                          )}
                        </div>

                        {editingEmail ? (
                          <>
                            {/* Token hints */}
                            <div className="flex flex-wrap gap-1">
                              {EMAIL_TOKEN_HINTS.map(token => (
                                <button
                                  key={token}
                                  onClick={() => setEmailBody(emailBody + ' ' + token)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                                >
                                  {token}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={emailSubject}
                              onChange={e => setEmailSubject(e.target.value)}
                              placeholder="Subject..."
                              className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                            />
                            <textarea
                              value={emailBody}
                              onChange={e => setEmailBody(e.target.value)}
                              rows={6}
                              className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-mono leading-relaxed resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setFollowUpTemplate(emailBody); setFollowUpSubjectTpl(emailSubject) }}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Save as default template
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                            <p className="font-medium mb-1 text-muted-foreground">Subject: {fillTokens(emailSubject, tokenData)}</p>
                            {fillTokens(emailBody, tokenData)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onNext}
                    className="py-2.5 px-4 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={!outcome || saving}
                    className="flex-1 py-2.5 text-sm rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={!outcome || saving}
                    className="flex-1 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    {saving ? 'Saving...' : <>Save & Next <ChevronRight className="h-4 w-4" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* Call history for this company */}
            {callLogs.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Call History ({callLogs.length})
                </p>
                <div className="space-y-2">
                  {callLogs.slice(0, 8).map(log => (
                    <div key={log.id} className="flex items-center gap-2 text-xs">
                      <PhoneCall className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CALL_OUTCOME_STYLES[log.outcome])}>
                        {CALL_OUTCOME_LABELS[log.outcome]}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">{log.calledPhone}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.calledAt).toLocaleDateString()}
                      </span>
                      {log.notes && <span className="text-muted-foreground text-[10px] truncate flex-1">— {log.notes}</span>}
                    </div>
                  ))}
                  {callLogs.length > 8 && (
                    <p className="text-[10px] text-muted-foreground">+{callLogs.length - 8} more</p>
                  )}
                </div>
              </div>
            )}

            {/* No phone at all */}
            {!company.phone && company.people.every(o => !o.phone) && phase === 'ready' && (
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">No phone numbers available for this company.</p>
                <button
                  onClick={onNext}
                  className="px-6 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Script + Objections */}
          <div className="space-y-4">
            {/* Script card */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Your Script
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { navigator.clipboard.writeText(filledScript) }}
                    title="Copy filled script"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingScript(!editingScript)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {editingScript ? <><Eye className="h-3.5 w-3.5" /> Preview</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                  </button>
                </div>
              </div>

              {/* Token hints */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CALL_TOKEN_HINTS.map(token => (
                  <button
                    key={token}
                    onClick={() => { if (editingScript) setScript(script + token) }}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-mono border transition-colors',
                      editingScript
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer'
                        : 'bg-muted text-muted-foreground border-border cursor-default'
                    )}
                  >
                    {token}
                  </button>
                ))}
              </div>

              {editingScript ? (
                <textarea
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  rows={14}
                  className="w-full text-sm bg-muted border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-mono leading-relaxed resize-none"
                />
              ) : (
                <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[200px]">
                  {filledScript}
                </div>
              )}
            </div>

            {/* Objection Playbook */}
            <div className="rounded-xl border border-border bg-card">
              <button
                onClick={() => setObjectionsOpen(!objectionsOpen)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/50 transition-colors"
              >
                Objection Playbook
                <ChevronDown className={cn('h-4 w-4 transition-transform', objectionsOpen && 'rotate-180')} />
              </button>

              {objectionsOpen && (
                <div className="px-5 pb-4 space-y-3">
                  {OBJECTION_PLAYBOOK.map((obj, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 border border-border p-3">
                      <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">
                        "{obj.trigger}"
                      </p>
                      <p className="text-xs text-foreground leading-relaxed">
                        {fillTokens(obj.response, tokenData)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Drop menu ────────────────────────────────────────────────────────────────

interface DropMenuProps {
  companyId: string
  onDrop: (companyId: string, disposition: DialDisposition) => void
}

const DROP_OPTIONS: { label: string; disposition: DialDisposition; color: string }[] = [
  { label: 'Return to pool',  disposition: 'None',          color: 'text-foreground' },
  { label: 'Not Interested',  disposition: 'NotInterested', color: 'text-red-600 dark:text-red-400' },
  { label: 'Bad Number',      disposition: 'BadNumber',     color: 'text-orange-600 dark:text-orange-400' },
  { label: 'Converted',       disposition: 'Converted',     color: 'text-emerald-600 dark:text-emerald-400' },
]

function DropMenu({ companyId, onDrop }: DropMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Drop lead"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Trash2 className="h-4 w-4" /> Drop
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-40">
            {DROP_OPTIONS.map(o => (
              <button
                key={o.disposition}
                onClick={() => { setOpen(false); onDrop(companyId, o.disposition) }}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors',
                  o.color
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
