import { PhoneCall } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { CALL_OUTCOME_STYLES, CALL_OUTCOME_LABELS } from '@/pages/LeadsPage/constants'
import type { CallLog } from '@/types'

interface CallHistoryCardProps {
  callLogs: CallLog[]
}

export function CallHistoryCard({ callLogs }: CallHistoryCardProps) {
  if (callLogs.length === 0) return null
  return (
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
            <span className="text-muted-foreground font-mono text-[10px]">{formatPhone(log.calledPhone)}</span>
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
  )
}
