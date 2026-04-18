import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Snowflake, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropMenu } from './DropMenu'
import type { Dialer, DialDisposition } from '@/types'

interface DialerHeaderProps {
  index: number
  total: number
  score: number
  attemptCount: number
  currentDialer: Dialer | null
  companyId: string
  onExit: () => void
  onPrev: () => void
  onNext: () => void
  onNextCold: () => void
  onSwitchDialer: () => void
  onAssignMore: () => void
  onDrop: (companyId: string, disposition: DialDisposition) => void
}

export function DialerHeader({
  index, total, score, attemptCount, currentDialer, companyId,
  onExit, onPrev, onNext, onNextCold, onSwitchDialer, onAssignMore, onDrop,
}: DialerHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>

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

        {attemptCount > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
            Attempt #{attemptCount + 1}
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
          onClick={onAssignMore}
          title="Assign more leads to your queue"
          className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Assign more
        </button>

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

        <DropMenu companyId={companyId} onDrop={onDrop} />
      </div>
    </div>
  )
}
