import { ArrowLeft, List, Plus, UserCircle } from 'lucide-react'
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
  onToggleQueue: () => void
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
  onExit, onToggleQueue, onSwitchDialer, onAssignMore, onDrop,
}: DialerHeaderProps) {
  const now = Date.now()
  const touch = Math.max(1, company.currentTouchNumber || 1)
  const day   = company.cadenceStartedAt
    ? Math.max(0, Math.floor((now - Date.parse(company.cadenceStartedAt)) / 86_400_000))
    : 0
  const started = !!company.cadenceStartedAt

  return (
    <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1.5 sm:px-3 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Leads</span>
        </button>

        <button
          onClick={onToggleQueue}
          title="Toggle lead queue"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors md:hidden"
        >
          <List className="h-4 w-4" />
        </button>

        {started ? (
          <span
            className={cn(
              'hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full',
              'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
            )}
            title="Position in 7-touch cadence"
          >
            Touch {touch}/{CADENCE_TOTAL_TOUCHES} · Day {day}
          </span>
        ) : (
          <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400">
            Fresh · Day 0
          </span>
        )}

        {lastCall && (
          <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Last: {lastCall.outcome} · {formatAgo(lastCall.calledAt, now)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {currentDialer && (
          <button
            onClick={onSwitchDialer}
            title="Switch dialer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-2 py-1.5 sm:px-2.5 rounded-lg transition-colors"
          >
            <UserCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-medium">{currentDialer.name}</span>
          </button>
        )}

        <div className="w-px h-5 bg-border" />

        <button
          onClick={onAssignMore}
          title="Assign more leads to your queue"
          className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2 py-1.5 sm:px-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Assign more</span>
        </button>

        <div className="w-px h-5 bg-border" />

        <DropMenu companyId={companyId} onDrop={onDrop} />
      </div>
    </div>
  )
}
