import { Phone, PhoneCall, Mail, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOURCE_STYLES, SOURCE_LABELS, STATUS_STYLES, CALL_OUTCOME_STYLES, CALL_OUTCOME_LABELS } from './constants'
import type { LeadPerson, Campaign, CallLog } from '@/types'

interface PersonRowProps {
  person: LeadPerson
  campaigns: Campaign[]
  lastCall?: CallLog
  attempts: number
  isSelected: boolean
  onSelect: () => void
  onCall: () => void
}

export function PersonRow({ person, campaigns, lastCall, attempts, isSelected, onSelect, onCall }: PersonRowProps) {
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

      {/* Name + Title + Source */}
      <div className="w-44 shrink-0 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug">
          {person.firstName} {person.lastName}
        </p>
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] text-muted-foreground truncate leading-snug">{person.title}</p>
          {person.sourcePage && (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 whitespace-nowrap shrink-0"
              title={`Found on the "${person.sourcePage}" page of their website`}
            >
              <MapPin className="h-2.5 w-2.5" />
              {person.sourcePage}
            </span>
          )}
        </div>
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

      {/* Phone + Call button */}
      <div className="w-40 shrink-0 flex items-center gap-2">
        {person.phone ? (
          <>
            <a
              href={`tel:${person.phone}`}
              onClick={e => e.stopPropagation()}
              className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline truncate transition-colors"
              title={`Call ${person.phone}`}
            >
              {person.phone}
            </a>
            <button
              onClick={e => { e.stopPropagation(); onCall() }}
              title={`Call ${person.firstName}`}
              className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-2 py-1 rounded transition-colors"
            >
              <Phone className="h-3 w-3" /> Call
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Call / Email status */}
      <div className="w-32 shrink-0 flex flex-col gap-1">
        {lastCall ? (
          <div className="flex items-center gap-1">
            <PhoneCall className="h-3 w-3 shrink-0" />
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CALL_OUTCOME_STYLES[lastCall.outcome])}>
              {CALL_OUTCOME_LABELS[lastCall.outcome]}
            </span>
            {attempts > 1 && (
              <span className="text-[9px] font-mono text-muted-foreground">x{attempts}</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">No calls</span>
        )}
        {lastCall && (() => {
          const days = Math.floor((Date.now() - new Date(lastCall.calledAt).getTime()) / 86_400_000)
          if (days < 1) return null
          return (
            <span className={cn('text-[9px]', days >= 7 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground')}>
              {days}d ago
            </span>
          )
        })()}
        {primaryEmail && (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', STATUS_STYLES[primaryEmail.status])}>
              {primaryEmail.status}
            </span>
          </div>
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
