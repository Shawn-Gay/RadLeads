import { ArrowLeft, Plus, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropMenu } from './DropMenu'
import { CADENCE_TOTAL_TOUCHES } from '@/lib/dialerQueue'
import type { CallLog, Dialer, DialDisposition, Company } from '@/types'

interface DialerHeaderProps {
  company: Company
  lastCall: CallLog | null
  currentDialer: Dialer | null
  companyId: string
  onExit: () => void
  onSwitchDialer: () => void
  onAssignMore: () => void
  onDrop: (companyId: string, disposition: DialDisposition) => void
}

function formatAgo(iso: string, now: number): string {
  const d = Math.floor((now - Date.parse(iso)) / 86_400_000)
  if (d >= 1) return `${d}d ago`
  const h = Math.floor((now - Date.parse(iso)) / 3_600_000)
  if (h >= 1) return `${h}h ago`
  return 'just now'
}

export function DialerHeader({
  company, lastCall, currentDialer, companyId,
  onExit, onSwitchDialer, onAssignMore, onDrop,
}: DialerHeaderProps) {
  const now = Date.now()
  const touch = Math.max(1, company.currentTouchNumber || 1)
  const day   = company.cadenceStartedAt
    ? Math.max(0, Math.floor((now - Date.parse(company.cadenceStartedAt)) / 86_400_000))
    : 0
  const started = !!company.cadenceStartedAt

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>

        {started ? (
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
            )}
            title="Position in 7-touch cadence"
          >
            Touch {touch}/{CADENCE_TOTAL_TOUCHES} · Day {day}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400">
            Fresh · Day 0
          </span>
        )}

        {lastCall && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Last: {lastCall.outcome} · {formatAgo(lastCall.calledAt, now)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
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
          onClick={onAssignMore}
          title="Assign more leads to your queue"
          className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Assign more
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <DropMenu companyId={companyId} onDrop={onDrop} />
      </div>
    </div>
  )
}
