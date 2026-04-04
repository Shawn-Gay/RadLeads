import { useState } from 'react'
import { Plus, X, Inbox, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Campaign, EmailAccount } from '@/types'

interface SendersTabProps {
  draft: Campaign
  accounts: EmailAccount[]
  onSave: (updated: Campaign) => void
}

function AccountStatusIcon({ status }: { status: EmailAccount['status'] }) {
  if (status === 'active')  return <CheckCircle2 className="h-3 w-3 text-emerald-500" />
  if (status === 'warming') return <Clock className="h-3 w-3 text-amber-500" />
  return <AlertCircle className="h-3 w-3 text-muted-foreground" />
}

function AccountStatusLabel({ status }: { status: EmailAccount['status'] }) {
  if (status === 'active')  return <span className="text-emerald-600 dark:text-emerald-400">Active</span>
  if (status === 'warming') return <span className="text-amber-600 dark:text-amber-400">Warming</span>
  return <span className="text-muted-foreground">Paused</span>
}

export function SendersTab({ draft, accounts, onSave }: SendersTabProps) {
  const [showPicker, setShowPicker] = useState(false)

  const assigned = accounts.filter(o => draft.senderIds.includes(o.id))
  const available = accounts.filter(o => !draft.senderIds.includes(o.id))

  function addSender(id: string) {
    onSave({ ...draft, senderIds: [...draft.senderIds, id] })
  }

  function removeSender(id: string) {
    onSave({ ...draft, senderIds: draft.senderIds.filter(o => o !== id) })
  }

  const totalDailyCapacity = assigned.reduce((n, o) => n + o.dailyLimit, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <div className="mr-auto">
          <p className="text-xs text-muted-foreground">
            {assigned.length === 0
              ? 'No inboxes assigned — emails will not send'
              : `${assigned.length} inbox${assigned.length !== 1 ? 'es' : ''} · ${totalDailyCapacity} emails/day capacity`}
          </p>
        </div>
        {available.length > 0 && (
          <button
            onClick={() => setShowPicker(p => !p)}
            className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Inbox
          </button>
        )}
      </div>

      {/* Picker dropdown */}
      {showPicker && available.length > 0 && (
        <div className="border-b border-border bg-muted/40 px-5 py-3 shrink-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Available inboxes
          </p>
          <div className="flex flex-col gap-1">
            {available.map(o => (
              <button
                key={o.id}
                onClick={() => { addSender(o.id); if (available.length === 1) setShowPicker(false) }}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted transition-colors group"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <Inbox className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{o.email}</p>
                  <p className="text-[11px] text-muted-foreground">{o.provider} · limit {o.dailyLimit}/day</p>
                </div>
                <AccountStatusIcon status={o.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assigned list */}
      <div className="flex-1 overflow-y-auto bg-background">
        {assigned.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No inboxes assigned</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add one or more sending inboxes. Emails will rotate across all assigned inboxes.
              </p>
            </div>
            {available.length > 0 && (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Inbox
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {assigned.map(o => (
              <div
                key={o.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 group transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Inbox className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <AccountStatusIcon status={o.status} />
                    <span className="text-[11px]"><AccountStatusLabel status={o.status} /></span>
                    <span className="text-[11px] text-muted-foreground">· {o.provider}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-foreground">{o.sentToday} / {o.dailyLimit}</p>
                  <p className="text-[11px] text-muted-foreground">sent today</p>
                </div>
                {o.health !== null && (
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className={cn('text-xs font-medium',
                      o.health >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                      : o.health >= 50 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-500'
                    )}>
                      {o.health}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">health</p>
                  </div>
                )}
                <button
                  onClick={() => removeSender(o.id)}
                  title="Remove inbox"
                  className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      {assigned.length > 1 && (
        <div className="border-t border-border bg-card px-5 py-2.5 shrink-0">
          <p className="text-[11px] text-muted-foreground">
            Emails will be distributed evenly across all {assigned.length} inboxes to avoid spam filters.
          </p>
        </div>
      )}
    </div>
  )
}
