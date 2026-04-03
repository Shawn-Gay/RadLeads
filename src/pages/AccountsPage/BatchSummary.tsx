import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailAccount, WarmupBatch } from '@/types'

interface BatchSummaryProps {
  batch: WarmupBatch
  accounts: EmailAccount[]
  onEdit: () => void
}

export function BatchSummary({ batch, accounts, onEdit }: BatchSummaryProps) {
  const validHealth = accounts.filter(o => o.health !== null)
  const avgHealth = validHealth.length > 0
    ? validHealth.reduce((sum, o) => sum + o.health!, 0) / validHealth.length
    : null
  const avgDay = accounts.reduce((sum, o) => sum + (o.warmupDay ?? 0), 0) / accounts.length

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
      <div>
        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          {batch.name}
        </p>
        <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} warming up together
        </p>
      </div>

      <div className="flex items-center gap-6 text-xs text-amber-700 dark:text-amber-400">
        <span>Avg day: <strong className="text-amber-900 dark:text-amber-200">{Math.round(avgDay)}</strong></span>
        {avgHealth !== null && (
          <span>
            Avg health:{' '}
            <strong className={cn(
              avgHealth >= 70 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-200'
            )}>
              {Math.round(avgHealth)}%
            </strong>
          </span>
        )}
      </div>

      <button
        onClick={onEdit}
        className="ml-auto flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 border border-amber-300 dark:border-amber-700 hover:border-amber-400 px-2.5 py-1 rounded-md transition-colors"
      >
        <Pencil className="h-3 w-3" /> Edit batch
      </button>
    </div>
  )
}
