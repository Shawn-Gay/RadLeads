import { useState } from 'react'
import { ChevronDown, ChevronUp, User, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { EmailAccount, WarmupActivity, AccountProvider, SenderPersonaInput } from '@/types'
import { useAppContext } from '@/context/AppContext'
import { WarmupPanel } from './WarmupPanel'

function ProviderBadge({ provider }: { provider: AccountProvider }) {
  const label = provider === 'namecheap' ? 'Namecheap' : provider === 'google' ? 'Google' : 'SMTP'
  return (
    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
      {label}
    </span>
  )
}

interface AccountCardProps {
  account: EmailAccount
  activities: WarmupActivity[]
  onToggle: () => void
}

export function AccountCard({ account: a, activities, onToggle }: AccountCardProps) {
  const { updateAccountSenderInfo } = useAppContext()
  const [expanded, setExpanded] = useState(false)
  const [personaOpen, setPersonaOpen] = useState(false)
  const [savingPersona, setSavingPersona] = useState(false)
  const [persona, setPersona] = useState<SenderPersonaInput>({
    firstName:    a.firstName,
    lastName:     a.lastName,
    title:        a.title,
    companyName:  a.companyName,
    phone:        a.phone,
    calendarLink: a.calendarLink,
    signature:    a.signature,
  })
  const pct = Math.round((a.sentToday / a.dailyLimit) * 100)
  const isWarming = a.status === 'warming'
  const senderLabel = [a.firstName, a.lastName].filter(Boolean).join(' ')

  async function handleSavePersona() {
    setSavingPersona(true)
    try {
      await updateAccountSenderInfo(a.id, {
        firstName:    persona.firstName?.trim()    || null,
        lastName:     persona.lastName?.trim()     || null,
        title:        persona.title?.trim()        || null,
        companyName:  persona.companyName?.trim()  || null,
        phone:        persona.phone?.trim()        || null,
        calendarLink: persona.calendarLink?.trim() || null,
        signature:    persona.signature?.trim()    || null,
      })
      setPersonaOpen(false)
    } finally {
      setSavingPersona(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg px-5 py-4">
      <div className="flex items-start gap-3">
        <span className={cn(
          'w-2.5 h-2.5 rounded-full mt-1 shrink-0',
          a.status === 'active'  ? 'bg-emerald-500' :
          a.status === 'warming' ? 'bg-amber-400'   : 'bg-muted-foreground'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{a.email}</p>
            <StatusBadge status={a.status} />
            <ProviderBadge provider={a.provider} />
            {a.warmupDay !== null && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full">
                Day {a.warmupDay} / {a.warmupTotalDays}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
            {a.health !== null && (
              <span>
                Health:{' '}
                <span className={cn(
                  'font-semibold',
                  a.health >= 80 ? 'text-emerald-600' : a.health >= 60 ? 'text-amber-600' : 'text-red-500'
                )}>{a.health}%</span>
              </span>
            )}
            <span>Sent today: <span className="font-semibold text-foreground">{a.sentToday}</span> / {a.dailyLimit}</span>
            <button
              onClick={() => setPersonaOpen(o => !o)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              title="Edit sender persona"
            >
              <User className="h-3 w-3" />
              {senderLabel || <span className="italic">Set sender name</span>}
            </button>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>

          {isWarming && expanded && (
            <WarmupPanel account={a} activities={activities} />
          )}

          {personaOpen && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sender Persona
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="First name"
                  value={persona.firstName ?? ''}
                  onChange={o => setPersona(p => ({ ...p, firstName: o.target.value }))}
                />
                <input
                  className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Last name"
                  value={persona.lastName ?? ''}
                  onChange={o => setPersona(p => ({ ...p, lastName: o.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Title"
                  value={persona.title ?? ''}
                  onChange={o => setPersona(p => ({ ...p, title: o.target.value }))}
                />
                <input
                  className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Company"
                  value={persona.companyName ?? ''}
                  onChange={o => setPersona(p => ({ ...p, companyName: o.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Phone"
                  value={persona.phone ?? ''}
                  onChange={o => setPersona(p => ({ ...p, phone: o.target.value }))}
                />
                <input
                  className="flex-1 text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Calendar link"
                  value={persona.calendarLink ?? ''}
                  onChange={o => setPersona(p => ({ ...p, calendarLink: o.target.value }))}
                />
              </div>
              <textarea
                rows={3}
                className="w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                placeholder="Signature (multiline)"
                value={persona.signature ?? ''}
                onChange={o => setPersona(p => ({ ...p, signature: o.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPersonaOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePersona}
                  disabled={savingPersona}
                  className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  <Save className="h-3 w-3" />
                  {savingPersona ? 'Saving…' : 'Save persona'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={onToggle}
            className={cn(
              'text-xs px-2.5 py-1.5 rounded-md border transition-colors',
              a.status === 'paused'
                ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {a.status === 'paused' ? 'Resume' : 'Pause'}
          </button>

          {isWarming && (
            <button
              onClick={() => setExpanded(o => !o)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              Warmup {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
