import { cn } from '@/lib/utils'
import { SOURCE_STYLES, SOURCE_LABELS, STATUS_STYLES } from './constants'
import type { Person, Campaign } from '@/types'

interface PersonRowProps {
  person: Person
  campaigns: Campaign[]
  isSelected: boolean
  onSelect: () => void
}

export function PersonRow({ person, campaigns, isSelected, onSelect }: PersonRowProps) {
  const primaryEmail    = person.emails.find(o => o.isPrimary) ?? person.emails[0]
  const personCampaigns = campaigns.filter(c => person.campaignIds.includes(c.id))

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-t border-border/40',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950'
          : 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
      )}
    >
      {/* Indent to align under company name (32px expand + 32px checkbox) */}
      <div className="w-16 shrink-0" />

      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
        {person.firstName[0]}{person.lastName[0]}
      </div>

      {/* Name + Title */}
      <div className="w-44 shrink-0 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug">
          {person.firstName} {person.lastName}
        </p>
        <p className="text-[11px] text-muted-foreground truncate leading-snug">{person.title}</p>
      </div>

      {/* Email + source / status badges */}
      <div className="flex-1 min-w-0">
        {primaryEmail ? (
          <>
            <p className="text-xs text-foreground truncate leading-snug">{primaryEmail.address}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', SOURCE_STYLES[primaryEmail.source])}>
                {SOURCE_LABELS[primaryEmail.source]}
              </span>
              <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', STATUS_STYLES[primaryEmail.status])}>
                {primaryEmail.status}
              </span>
              {person.emails.length > 1 && (
                <span className="text-[9px] text-muted-foreground">+{person.emails.length - 1} more</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Campaigns */}
      <div className="w-48 shrink-0 flex flex-wrap gap-1 items-center">
        {personCampaigns.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <>
            {personCampaigns.slice(0, 2).map(c => (
              <span
                key={c.id}
                title={c.name}
                className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 whitespace-nowrap"
              >
                {c.name.length > 16 ? c.name.slice(0, 14) + '…' : c.name}
              </span>
            ))}
            {personCampaigns.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{personCampaigns.length - 2}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
