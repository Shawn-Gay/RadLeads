import { PhoneCall, User } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { useAppContext } from '@/context/AppContext'
import { CALL_OUTCOME_STYLES, CALL_OUTCOME_LABELS } from '@/pages/LeadsPage/constants'
import type { CallLog } from '@/types'

interface CallHistoryCardProps {
  callLogs: CallLog[]
}

export function CallHistoryCard({ callLogs }: CallHistoryCardProps) {
  const { dialers } = useAppContext()
  if (callLogs.length === 0) return null
  const nameById = new Map(dialers.map(o => [o.id, o.name]))
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Call History ({callLogs.length})
      </p>
      <div className="space-y-2">
        {callLogs.slice(0, 8).map(log => {
          const dialerName = log.dialerId ? nameById.get(log.dialerId) : undefined
          return (
            <div key={log.id} className="flex items-center gap-2 text-xs">
              <PhoneCall className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CALL_OUTCOME_STYLES[log.outcome])}>
                {CALL_OUTCOME_LABELS[log.outcome]}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">{formatPhone(log.calledPhone)}</span>
              <span className="text-muted-foreground text-[10px]">
                {new Date(log.calledAt).toLocaleDateString()}
              </span>
              {dialerName && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                  <User className="h-2.5 w-2.5" />
                  {dialerName}
                </span>
              )}
              {log.notes && <span className="text-muted-foreground text-[10px] truncate flex-1">— {log.notes}</span>}
            </div>
          )
        })}
        {callLogs.length > 8 && (
          <p className="text-[10px] text-muted-foreground">+{callLogs.length - 8} more</p>
        )}
      </div>
    </div>
  )
}
