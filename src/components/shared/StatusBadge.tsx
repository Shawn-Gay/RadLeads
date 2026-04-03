import { cn } from '@/lib/utils'
import type { CampaignStatus, AccountStatus } from '@/types'

type AnyStatus = CampaignStatus | AccountStatus

const STATUS_CLASSES: Record<AnyStatus, string> = {
  draft:   'bg-muted text-muted-foreground',
  warming: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  active:  'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  paused:  'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
}

interface StatusBadgeProps {
  status: AnyStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
        STATUS_CLASSES[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {status}
    </span>
  )
}
