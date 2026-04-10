import { ChevronRight, Globe, Sparkles, RefreshCw, Loader2, ExternalLink, Phone, PhoneCall, Calendar, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPANY_GRID, CALL_OUTCOME_STYLES, CALL_OUTCOME_LABELS } from './constants'
import { EnrichBadge } from './EnrichBadge'
import { PersonRow } from './PersonRow'
import type { Company, Campaign, CallLog, EnrichStatus } from '@/types'

const PIPELINE_STAGES: { key: EnrichStatus[]; label: string }[] = [
  { key: ['not_enriched'],              label: 'Imported' },
  { key: ['researching', 'researched'], label: 'Researched' },
  { key: ['enriching', 'enriched'],     label: 'Enriched' },
]

interface CompanyRowProps {
  company: Company
  campaigns: Campaign[]
  callLogsByPerson: Map<string, CallLog>
  companyCallLogs: CallLog[]
  isExpanded: boolean
  isChecked: boolean
  selectedPersonId: string | null
  onExpand: () => void
  onCheck: (checked: boolean) => void
  onSelectPerson: (personId: string | null) => void
  onResearch: () => void
  onEnrich: () => void
  onCallCompany: () => void
  onCall: (personId: string) => void
}

export function CompanyRow({
  company, campaigns, callLogsByPerson, companyCallLogs,
  isExpanded, isChecked, selectedPersonId,
  onExpand, onCheck, onSelectPerson,
  onResearch, onEnrich, onCallCompany, onCall,
}: CompanyRowProps) {
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
        <div className="min-w-0 pl-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <a
              href={`https://${company.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline truncate transition-colors"
              title={`Open ${company.domain}`}
            >
              {company.domain}
            </a>
            <ExternalLink className="h-3 w-3 shrink-0 text-blue-400 dark:text-blue-500" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-xs text-muted-foreground truncate cursor-pointer" onClick={onExpand}>{company.name}</p>
            {company.phone && (
              <button
                onClick={e => { e.stopPropagation(); onCallCompany() }}
                className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors"
                title={`Call ${company.phone}`}
              >
                <Phone className="h-3 w-3" /> {company.phone}
              </button>
            )}
          </div>
        </div>

        {/* People count */}
        <div>
          <span className="text-xs text-muted-foreground">
            {company.people.length} {company.people.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {/* Last call outcome */}
        <div>
          {companyCallLogs.length > 0 ? (() => {
            const latest = companyCallLogs.reduce((a, b) =>
              new Date(a.calledAt) > new Date(b.calledAt) ? a : b
            )
            return (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CALL_OUTCOME_STYLES[latest.outcome])}>
                {CALL_OUTCOME_LABELS[latest.outcome]}
              </span>
            )
          })() : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>

        {/* Stage badge */}
        <div>
          <EnrichBadge status={company.enrichStatus} />
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
          ) : company.enrichStatus === 'research_failed' ? (
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

      {/* Expanded: company details + people */}
      {isExpanded && (() => {
        const activeIndex = PIPELINE_STAGES.findIndex(o => o.key.includes(company.enrichStatus))
        const hasDetails = company.summary || company.recentNews || companyCallLogs.length > 0 || company.meetingLink || company.pagesCrawledCount > 0

        return (
          <div className="border-t border-border/60 bg-muted/10">

            {/* Company details banner */}
            <div className="pl-16 pr-5 py-4 border-b border-border/40">

              {/* Pipeline stepper */}
              <div className="flex items-center max-w-sm mb-4">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isLastStage = activeIndex === PIPELINE_STAGES.length - 1
                  const isDone    = i < activeIndex || (isLastStage && i === activeIndex)
                  const isActive  = i === activeIndex && !isLastStage
                  return (
                    <div key={stage.label} className="flex items-center flex-1 last:flex-initial">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                          isDone   && 'bg-emerald-500 text-white',
                          isActive && 'bg-blue-500 text-white ring-2 ring-blue-500/30',
                          !isDone && !isActive && 'bg-muted text-muted-foreground border border-border',
                        )}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className={cn(
                          'text-[11px] font-medium whitespace-nowrap',
                          isDone   && 'text-emerald-600 dark:text-emerald-400',
                          isActive && 'text-blue-600 dark:text-blue-400',
                          !isDone && !isActive && 'text-muted-foreground',
                        )}>
                          {stage.label}
                        </span>
                      </div>
                      {i < PIPELINE_STAGES.length - 1 && (
                        <div className={cn(
                          'flex-1 h-px mx-2',
                          isDone ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-border',
                        )} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Quick-info chips */}
              {(company.meetingLink || company.pagesCrawledCount > 0) && (
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {company.meetingLink && (
                    <a
                      href={company.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                      title="Book a meeting directly"
                    >
                      <Calendar className="h-3 w-3" />
                      Book Meeting
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {company.pagesCrawledCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                      title={`${company.pagesCrawledCount} pages were crawled from this company's website`}
                    >
                      <FileText className="h-3 w-3" />
                      {company.pagesCrawledCount} pages crawled
                    </span>
                  )}
                </div>
              )}

              {/* Content cards row */}
              {hasDetails && (
                <div className="flex gap-3 flex-wrap">

                  {/* Summary card */}
                  {company.summary && (
                    <div className="flex-1 min-w-[200px] rounded-lg border border-sky-200 dark:border-sky-800/50 bg-sky-50/50 dark:bg-sky-950/30 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Globe className="h-3 w-3 text-sky-500" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">Summary</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{company.summary}</p>
                    </div>
                  )}

                  {/* Recent News card */}
                  {company.recentNews && (
                    <div className="flex-1 min-w-[200px] rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/30 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Recent News</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{company.recentNews}</p>
                    </div>
                  )}

                  {/* Call history card */}
                  {companyCallLogs.length > 0 && (
                    <div className="flex-1 min-w-[200px] rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <PhoneCall className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Calls ({companyCallLogs.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {companyCallLogs.slice(0, 4).map(log => (
                          <div key={log.id} className="flex items-center gap-2">
                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none', CALL_OUTCOME_STYLES[log.outcome])}>
                              {CALL_OUTCOME_LABELS[log.outcome]}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {new Date(log.calledAt).toLocaleDateString()}
                            </span>
                            {log.notes && (
                              <span className="text-muted-foreground text-[10px] truncate" title={log.notes}>
                                {log.notes}
                              </span>
                            )}
                          </div>
                        ))}
                        {companyCallLogs.length > 4 && (
                          <p className="text-[10px] text-muted-foreground">+{companyCallLogs.length - 4} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* People rows */}
            <div>
              {company.people.length === 0 ? (
                <p className="px-16 py-4 text-xs text-muted-foreground italic">No people yet.</p>
              ) : (
                company.people.map(person => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    campaigns={campaigns}
                    lastCall={callLogsByPerson.get(person.id)}
                    isSelected={selectedPersonId === person.id}
                    onSelect={() => onSelectPerson(selectedPersonId === person.id ? null : person.id)}
                    onCall={() => onCall(person.id)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
