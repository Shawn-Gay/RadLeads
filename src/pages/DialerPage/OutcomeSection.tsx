import { Link } from '@tanstack/react-router'
import { ChevronRight, Clock, Mail, MailCheck, MailX, Pencil, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fillTokens, EMAIL_TOKEN_HINTS } from '@/lib/tokens'
import { CALL_OUTCOME_LABELS } from '@/pages/LeadsPage/constants'
import type { CallOutcome, EmailTemplate, EmailAccount } from '@/types'
import type { TokenData } from '@/lib/tokens'

interface OutcomeSectionProps {
  outcome: CallOutcome | null
  onOutcomeChange: (v: CallOutcome) => void
  callbackAt: string
  onCallbackAtChange: (v: string) => void
  notes: string
  onNotesChange: (v: string) => void
  followUpToAddress: string | null
  primaryEmailExists: boolean
  sendFollowUp: boolean
  onToggleSendFollowUp: () => void
  editingEmail: boolean
  onToggleEditingEmail: () => void
  emailSubject: string
  onEmailSubjectChange: (v: string) => void
  emailBody: string
  onEmailBodyChange: (v: string) => void
  selectedTemplateId: string | null
  templatesForOutcome: EmailTemplate[]
  selectedTemplate: EmailTemplate | null
  onTemplateChange: (id: string) => void
  sendableAccounts: EmailAccount[]
  selectedFromAccount: EmailAccount | undefined
  onFromAccountIdChange: (id: string) => void
  tokenData: TokenData
  saving: boolean
  onSkip: () => void
  onSave: () => void
  onSaveAndNext: () => void
}

const OUTCOMES: { value: CallOutcome; label: string; color: string }[] = [
  { value: 'Connected',     label: 'Connected',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'Interested',    label: 'Interested!',    color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { value: 'CallBack',      label: 'Call Back',      color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  { value: 'LeftVoicemail', label: 'Left Voicemail', color: 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
  { value: 'LeftMessage',   label: 'Left Message',   color: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' },
  { value: 'NoAnswer',      label: 'No Answer',      color: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { value: 'NotInterested', label: 'Not Interested', color: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
  { value: 'WrongNumber',   label: 'Wrong Number',   color: 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
]

export function OutcomeSection({
  outcome, onOutcomeChange,
  callbackAt, onCallbackAtChange,
  notes, onNotesChange,
  followUpToAddress, primaryEmailExists,
  sendFollowUp, onToggleSendFollowUp,
  editingEmail, onToggleEditingEmail,
  emailSubject, onEmailSubjectChange,
  emailBody, onEmailBodyChange,
  selectedTemplateId, templatesForOutcome, selectedTemplate, onTemplateChange,
  sendableAccounts, selectedFromAccount, onFromAccountIdChange,
  tokenData,
  saving, onSkip, onSave, onSaveAndNext,
}: OutcomeSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground mb-3">How did the call go?</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {OUTCOMES.map(o => (
          <button
            key={o.value}
            onClick={() => onOutcomeChange(o.value)}
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

      {outcome === 'CallBack' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Call back:</span>
          <input
            type="datetime-local"
            value={callbackAt}
            onChange={e => onCallbackAtChange(e.target.value)}
            className="flex-1 text-xs bg-transparent border-none focus:outline-none text-foreground"
          />
        </div>
      )}

      <textarea
        value={notes}
        onChange={e => onNotesChange(e.target.value)}
        placeholder="Notes (optional)..."
        rows={3}
        className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground resize-none mb-4"
      />

      {outcome && followUpToAddress && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onToggleSendFollowUp}
              className="flex items-center gap-2 text-xs font-semibold"
            >
              {sendFollowUp
                ? <MailCheck className="h-4 w-4 text-emerald-600" />
                : <MailX className="h-4 w-4 text-muted-foreground" />}
              <span className={sendFollowUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>
                Follow-up Email {sendFollowUp ? 'ON' : 'OFF'}
              </span>
            </button>

            {sendFollowUp && (
              <button
                onClick={onToggleEditingEmail}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {editingEmail ? <><Eye className="h-3.5 w-3.5" /> Preview</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
              </button>
            )}
          </div>

          {sendFollowUp && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MailCheck className="h-3 w-3 shrink-0" />
                <span className="shrink-0">Template:</span>
                {templatesForOutcome.length === 0 ? (
                  <span className="text-[10px] italic text-amber-600 dark:text-amber-400 flex-1">
                    No template for "{CALL_OUTCOME_LABELS[outcome]}" —{' '}
                    <Link to="/email-templates" className="underline hover:text-amber-700">assign one</Link>
                  </span>
                ) : (
                  <>
                    <select
                      value={selectedTemplateId ?? ''}
                      onChange={e => onTemplateChange(e.target.value)}
                      className="flex-1 text-xs bg-muted border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                    >
                      {templatesForOutcome.map(t => {
                        const isDefault = t.outcomeAssignments.find(a => a.outcome === outcome)?.isDefault
                        return (
                          <option key={t.id} value={t.id}>
                            {isDefault ? '★ ' : ''}{t.name}
                          </option>
                        )
                      })}
                    </select>
                    <Link
                      to="/email-templates"
                      title="Manage templates"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Link>
                  </>
                )}
              </div>

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
                    onChange={e => onFromAccountIdChange(e.target.value)}
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
                {!primaryEmailExists && <span className="text-[10px] italic">(company fallback)</span>}
              </div>

              {editingEmail ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    {EMAIL_TOKEN_HINTS.map(token => (
                      <button
                        key={token}
                        onClick={() => onEmailBodyChange(emailBody + ' ' + token)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => onEmailSubjectChange(e.target.value)}
                    placeholder="Subject..."
                    className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                  />
                  <textarea
                    value={emailBody}
                    onChange={e => onEmailBodyChange(e.target.value)}
                    rows={6}
                    className="w-full text-xs bg-muted border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-mono leading-relaxed resize-none"
                  />
                  {selectedTemplate && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Editing a per-send copy. Permanent changes go through{' '}
                      <Link to="/email-templates" className="text-blue-600 hover:underline">Email Templates</Link>.
                    </p>
                  )}
                </>
              ) : (
                <div className="bg-muted/50 border border-border rounded-md px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  <p className="font-medium mb-1 text-muted-foreground">
                    Subject: {fillTokens(emailSubject, tokenData)}
                  </p>
                  {fillTokens(emailBody, tokenData)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="py-2.5 px-4 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
        >
          Skip
        </button>
        <button
          onClick={onSave}
          disabled={!outcome || saving}
          className="flex-1 py-2.5 text-sm rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onSaveAndNext}
          disabled={!outcome || saving}
          className="flex-1 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          {saving ? 'Saving...' : <><span>Save &amp; Next</span> <ChevronRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  )
}
