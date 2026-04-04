import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/types'

interface CampaignTopbarProps {
  draft: Campaign
  onSave: (updated: Campaign) => void
  onToggleStatus: () => void
}

export function CampaignTopbar({ draft, onSave, onToggleStatus }: CampaignTopbarProps) {
  return (
    <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-3 shrink-0">
      <Link
        to="/campaigns"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Campaigns
      </Link>
      <span className="text-border">/</span>
      <input
        className="text-sm font-semibold text-foreground bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1 min-w-0 flex-1"
        value={draft.name}
        onChange={o => onSave({ ...draft, name: o.target.value })}
      />
      <StatusBadge status={draft.status} className="shrink-0" />

      <button
        onClick={onToggleStatus}
        className={cn(
          'text-xs px-2.5 py-1.5 rounded-md transition-colors shrink-0',
          draft.status === 'active'
            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        )}
      >
        {draft.status === 'active' ? 'Pause' : 'Activate'}
      </button>
    </div>
  )
}
