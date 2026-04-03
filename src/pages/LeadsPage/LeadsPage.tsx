import { Search } from 'lucide-react'
import { PersonDetailPanel } from '@/components/leads/LeadDetailPanel'
import { ImportCSVDialog } from '@/components/leads/ImportCSVDialog'
import { cn } from '@/lib/utils'
import { useLeadsPage } from './useLeadsPage'
import { LeadsToolbar } from './LeadsToolbar'
import { LeadsTabs } from './LeadsTabs'
import { CompanyRow } from './CompanyRow'
import { COMPANY_GRID } from './constants'

export function LeadsPage() {
  const state = useLeadsPage()

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
      />

      <LeadsTabs
        activeTab={state.activeTab}
        tabCounts={state.tabCounts}
        onTabChange={state.setActiveTab}
      />

      {/* Search */}
      <div className="bg-card border-b border-border px-5 py-2 shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search domains, companies, people…"
            value={state.search}
            onChange={e => state.setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table + detail panel */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="min-w-[720px]">

            {/* Header row */}
            <div className={cn('sticky top-0 z-10 bg-muted border-b border-border grid px-3 py-2 items-center', COMPANY_GRID)}>
              <div />
              <div>
                <input
                  type="checkbox"
                  checked={state.allChecked}
                  onChange={e => state.toggleCheckAll(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 dark:[color-scheme:dark] cursor-pointer"
                />
              </div>
              <div className="text-xs font-medium text-muted-foreground pl-1">Domain / Company</div>
              <div className="text-xs font-medium text-muted-foreground">People</div>
              <div className="text-xs font-medium text-muted-foreground">Stage</div>
              <div className="text-xs font-medium text-muted-foreground">Last Updated</div>
              <div />
            </div>

            {/* Rows */}
            <div className="bg-card divide-y divide-border">
              {state.filtered.length === 0 && (
                <div className="px-4 py-16 text-center">
                  <p className="text-sm text-muted-foreground">No leads match your filter.</p>
                  <button
                    onClick={() => { state.setActiveTab('all'); state.setSearch('') }}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {state.filtered.map(company => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  campaigns={state.campaigns}
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
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {state.selectedDetail && (
          <PersonDetailPanel
            company={state.selectedDetail.company}
            person={state.selectedDetail.person}
            campaigns={state.campaigns}
            onClose={() => state.setSelected(null)}
          />
        )}
      </div>

      {/* Import dialog */}
      {state.showImport && (
        <ImportCSVDialog
          onClose={() => state.setShowImport(false)}
          onImport={people => {
            state.addFromImport(people)
            state.setShowImport(false)
          }}
        />
      )}
    </div>
  )
}
