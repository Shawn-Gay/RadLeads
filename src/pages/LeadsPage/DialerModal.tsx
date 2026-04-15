import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Phone, X, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhoneNumber } from '@/components/leads/PhoneNumber'
import { logCall } from '@/services/callLogs'
import type { Company, LeadPerson, CallOutcome } from '@/types'

interface DialerModalProps {
  company: Company
  initialPersonId: string | null
  onNext: () => void
  onExit: () => void
}

type Phase = 'calling' | 'outcome'

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
  { value: 'NoAnswer',      label: 'No Answer',      color: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { value: 'NotInterested', label: 'Not Interested', color: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
  { value: 'WrongNumber',   label: 'Wrong Number',   color: 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
]

export function DialerModal({ company, initialPersonId, onNext, onExit }: DialerModalProps) {
  const callablePeople = company.people.filter(o => o.phone)

  const initialIndex = callablePeople.findIndex(o => o.id === initialPersonId)
  const [personIndex, setPersonIndex] = useState(Math.max(0, initialIndex))
  const [phase, setPhase]             = useState<Phase>('calling')
  const [outcome, setOutcome]         = useState<CallOutcome | null>(null)
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)

  const person: LeadPerson | undefined = callablePeople[personIndex]

  // Reset outcome state when person changes
  useEffect(() => {
    setPhase('calling')
    setOutcome(null)
    setNotes('')
  }, [personIndex])

  function fireConfetti() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
    })
  }

  function handleCall() {
    if (!person?.phone) return
    fireConfetti()
    window.location.href = `tel:${person.phone}`
    setPhase('outcome')
  }

  async function handleSaveAndNext() {
    if (!person || !outcome) return
    setSaving(true)
    try {
      await logCall({
        personId:    person.id,
        calledPhone: person.phone!,
        outcome,
        notes:       notes.trim() || undefined,
      })
    } finally {
      setSaving(false)
    }
    onNext()
  }

  function handleSkip() {
    onNext()
  }

  if (!person) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <p className="text-sm text-muted-foreground mb-4">No people with phone numbers in this company.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onExit} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Exit</button>
            <button onClick={onNext} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" /> Exit
          </button>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dialer</span>
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Company */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{company.name}</span>
            <a
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{company.domain}</p>
        </div>

        {/* Person selector (if multiple callable people) */}
        {callablePeople.length > 1 && (
          <div className="px-5 pb-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Decision Maker</label>
            <select
              value={personIndex}
              onChange={e => setPersonIndex(Number(e.target.value))}
              className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
            >
              {callablePeople.map((o, i) => (
                <option key={o.id} value={i}>
                  {o.firstName} {o.lastName} — {o.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Person card */}
        <div className="mx-5 mb-5 rounded-xl bg-muted/50 border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold shrink-0">
              {person.firstName[0]}{person.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {person.firstName} {person.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{person.title}</p>
            </div>
          </div>
          <PhoneNumber
            phone={person.phone!}
            size="md"
            iconColor="text-muted-foreground"
            asLink={false}
            className="mt-3 font-medium text-foreground"
          />
        </div>

        {/* Call button (calling phase) */}
        {phase === 'calling' && (
          <div className="px-5 pb-6 flex justify-center">
            <button
              onClick={handleCall}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-emerald-200 dark:shadow-emerald-900 transition-all"
            >
              <Phone className="h-4 w-4" />
              Call
            </button>
          </div>
        )}

        {/* Outcome phase */}
        {phase === 'outcome' && (
          <div className="border-t border-border px-5 py-5">
            <p className="text-sm font-semibold text-foreground mb-3">How did the call go?</p>

            {/* Outcome pills */}
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

            {/* Notes */}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)…"
              rows={2}
              className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground resize-none mb-4"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
              >
                Skip
              </button>
              <button
                onClick={handleSaveAndNext}
                disabled={!outcome || saving}
                className="flex-1 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? 'Saving…' : <>Save &amp; Next <ChevronRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
