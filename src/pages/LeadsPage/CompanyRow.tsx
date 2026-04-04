import { ChevronRight, Globe, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPANY_GRID } from './constants'
import { EnrichBadge } from './EnrichBadge'
import { PersonRow } from './PersonRow'
import type { Company, Campaign } from '@/types'

interface CompanyRowProps {
  company: Company
  campaigns: Campaign[]
  isExpanded: boolean
  isChecked: boolean
  selectedPersonId: string | null
  onExpand: () => void
  onCheck: (checked: boolean) => void
  onSelectPerson: (personId: string | null) => void
  onResearch: () => void
  onEnrich: () => void
}

export function CompanyRow({
  company, campaigns,
  isExpanded, isChecked, selectedPersonId,
  onExpand, onCheck, onSelectPerson,
  onResearch, onEnrich,
}: CompanyRowProps) {
  const lastUpdated = company.enrichedAt ?? company.researchedAt ?? '—'
  const isInProgress = company.enrichStatus === 'researching' || company.enrichStatus === 'enriching'

  return (
    <div className={cn(isExpanded && 'bg-muted/20')}>

      {/* Company row */}
      <div className={cn('grid items-center px-3 py-3 transition-colors', COMPANY_GRID, isExpanded ? 'bg-muted/30' : 'hover:bg-muted/40')}>

        {/* Expand chevron */}
        <button
          onClick={onExpand}
          className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform duration-150', isExpanded && 'rotate-90')} />
        </button>

        {/* Checkbox */}
        <div className='grid items-center'>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={e => onCheck(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600 dark:[color-scheme:dark] cursor-pointer"
          />
        </div>

        {/* Domain / Company name */}
        <div className="min-w-0 cursor-pointer pl-1" onClick={onExpand}>
          <p className="text-sm font-semibold text-foreground truncate">{company.domain}</p>
          <p className="text-xs text-muted-foreground truncate">{company.name}</p>
        </div>

        {/* People count */}
        <div>
          <span className="text-xs text-muted-foreground">
            {company.people.length} {company.people.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {/* Stage badge */}
        <div>
          <EnrichBadge status={company.enrichStatus} />
        </div>

        {/* Last updated */}
        <div>
          <span className="text-xs text-muted-foreground">{lastUpdated}</span>
        </div>

        {/* Pipeline action */}
        <div className="flex items-center justify-end gap-1">
          {isInProgress ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : company.enrichStatus === 'not_enriched' ? (
            <button
              onClick={onResearch}
              title="Research this company"
              className="flex items-center gap-1 text-[10px] font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 px-1.5 py-1 rounded transition-colors"
            >
              <Globe className="h-3 w-3" /> Research
            </button>
          ) : company.enrichStatus === 'researched' ? (
            <button
              onClick={onEnrich}
              title="Enrich this company"
              className="flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950 px-1.5 py-1 rounded transition-colors"
            >
              <Sparkles className="h-3 w-3" /> Enrich
            </button>
          ) : company.enrichStatus === 'enriched' ? (
            <button
              onClick={onResearch}
              title="Re-research"
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          ) : company.enrichStatus === 'failed' ? (
            <button
              onClick={onResearch}
              title="Retry"
              className="flex items-center gap-1 text-[10px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 px-1.5 py-1 rounded transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          ) : null}
        </div>
      </div>

      {/* Person rows */}
      {isExpanded && (
        <div className="border-t border-border/60 bg-muted/10">
          {company.people.length === 0 ? (
            <p className="px-16 py-4 text-xs text-muted-foreground italic">No people yet.</p>
          ) : (
            company.people.map(person => (
              <PersonRow
                key={person.id}
                person={person}
                campaigns={campaigns}
                isSelected={selectedPersonId === person.id}
                onSelect={() => onSelectPerson(selectedPersonId === person.id ? null : person.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
