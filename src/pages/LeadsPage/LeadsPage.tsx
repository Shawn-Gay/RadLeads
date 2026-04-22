import { useRef } from 'react'
import { Search, ArrowUp, ArrowDown } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PersonDetailPanel } from '@/components/leads/LeadDetailPanel'
import { ImportCSVDialog } from '@/components/leads/ImportCSVDialog'
import { cn } from '@/lib/utils'
import { useLeadsPage } from './useLeadsPage'
import { LeadsToolbar } from './LeadsToolbar'
import { LeadsTabs } from './LeadsTabs'
import { CompanyRow } from './CompanyRow'
import { COMPANY_GRID } from './constants'
import type { SortKey } from './constants'

interface SortHeaderProps {
  label: string
  sortKey: SortKey
  active: SortKey | null
  dir: 'asc' | 'desc'
  onClick: (key: SortKey) => void
  className?: string
}
function SortHeader({ label, sortKey, active, dir, onClick, className }: SortHeaderProps) {
  const isActive = active === sortKey
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium text-left transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {label}
      {isActive && (dir === 'asc'
        ? <ArrowUp   className="h-3 w-3" />
        : <ArrowDown className="h-3 w-3" />)}
    </button>
  )
}

export function LeadsPage() {
  const state = useLeadsPage()
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: state.filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: o => state.expandedIds.has(state.filtered[o].id)
      ? 48 + state.filtered[o].people.length * 48
      : 48,
    measureElement: el => el.getBoundingClientRect().height,
    overscan: 8,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <LeadsToolbar
        companiesCount={state.companies.length}
        totalPeople={state.totalPeople}
        researchedCount={state.researchedCount}
        enrichedCount={state.enrichedCount}
        someChecked={state.someChecked}
        checkedNotStartedCount={state.checkedNotStartedCount}
        checkedResearchedCount={state.checkedResearchedCount}
        checkedEnrichedCount={state.checkedEnrichedCount}
        campaigns={state.campaigns}
        showCampaignPicker={state.showCampaignPicker}
        campaignPickerRef={state.campaignPickerRef}
        onExport={state.exportCSV}
        onImport={() => state.setShowImport(true)}
        onResearchSelected={state.handleResearchSelected}
        onEnrichSelected={state.handleEnrichSelected}
        onAddToCampaign={state.handleAddToCampaign}
        onToggleCampaignPicker={() => state.setShowCampaignPicker(o => !o)}
        onStartDialer={state.startDialer}
      />

      <LeadsTabs
        activeTab={state.activeTab}
        tabCounts={state.tabCounts}
        onTabChange={state.setActiveTab}
      />

      <div className="bg-card border-b border-border px-5 py-2 shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search domains, companies, people..."
            value={state.search}
            onChange={e => state.setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="min-w-[820px]">

            <div className={cn('sticky top-0 z-10 bg-muted border-b border-border grid px-3 py-2 items-center', COMPANY_GRID)}>
              <div />
              <div className='grid items-center'>
                <input
                  type="checkbox"
                  checked={state.allChecked}
                  onChange={e => state.toggleCheckAll(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 dark:[color-scheme:dark] cursor-pointer"
                />
              </div>
              <SortHeader label="Domain / Company" sortKey="domain"   active={state.sortKey} dir={state.sortDir} onClick={state.toggleSort} className="pl-1" />
              <SortHeader label="People"           sortKey="people"   active={state.sortKey} dir={state.sortDir} onClick={state.toggleSort} />
              <SortHeader label="Last Call"        sortKey="lastCall" active={state.sortKey} dir={state.sortDir} onClick={state.toggleSort} />
              <SortHeader label="Assigned To"      sortKey="assigned" active={state.sortKey} dir={state.sortDir} onClick={state.toggleSort} />
              <SortHeader label="Stage"            sortKey="stage"    active={state.sortKey} dir={state.sortDir} onClick={state.toggleSort} />
              <div />
            </div>

            {state.filtered.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-sm text-muted-foreground">No leads match your filter.</p>
                <button
                  onClick={() => { state.setActiveTab('all'); state.setSearch('') }}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bg-card relative" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map(vitem => {
                  const company = state.filtered[vitem.index]
                  return (
                    <div
                      key={company.id}
                      ref={virtualizer.measureElement}
                      data-index={vitem.index}
                      className="absolute top-0 left-0 w-full border-b border-border"
                      style={{ transform: `translateY(${vitem.start}px)` }}
                    >
                      <CompanyRow
                        company={company}
                        campaigns={state.campaigns}
                        assignedToName={company.assignedToId ? state.dialerNameById.get(company.assignedToId) ?? null : null}
                        callLogsByPerson={state.callLogsByPerson}
                        attemptsByPerson={state.attemptsByPerson}
                        companyCallLogs={state.callLogsByCompany.get(company.id) ?? []}
                        isExpanded={state.expandedIds.has(company.id)}
                        isChecked={state.checkedIds.has(company.id)}
                        selectedPersonId={
                          state.selected?.companyId === company.id ? state.selected.personId : null
                        }
                        onExpand={() => state.toggleExpand(company.id)}
                        onCheck={checked => state.toggleCheck(company.id, checked)}
                        onSelectPerson={personId =>
                          state.setSelected(personId ? { companyId: company.id, personId } : null)
                        }
                        onResearch={() => state.handleResearch(company.id)}
                        onEnrich={() => state.handleEnrich(company.id)}
                        onFindDecisionMaker={() => state.handleFindDecisionMaker(company.id)}
                        onCallCompany={() => state.openDialer(company.id)}
                        onCall={personId => state.openDialer(company.id, personId)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {state.selectedDetail && (
          <PersonDetailPanel
            company={state.selectedDetail.company}
            person={state.selectedDetail.person}
            campaigns={state.campaigns}
            onClose={() => state.setSelected(null)}
          />
        )}
      </div>

      {state.showImport && (
        <ImportCSVDialog
          onClose={() => state.setShowImport(false)}
          onImportPeople={people => {
            state.addFromImport(people)
            state.setShowImport(false)
          }}
          onImportCompanies={companies => {
            state.addFromCompanyImport(companies)
            state.setShowImport(false)
          }}
        />
      )}
    </div>
  )
}
