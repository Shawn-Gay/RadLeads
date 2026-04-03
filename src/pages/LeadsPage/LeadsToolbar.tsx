import { Download, Upload, Globe, Sparkles, Users, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Campaign } from '@/types'

interface LeadsToolbarProps {
  companiesCount: number
  totalPeople: number
  researchedCount: number
  enrichedCount: number
  someChecked: boolean
  checkedNotStartedCount: number
  checkedResearchedCount: number
  checkedEnrichedCount: number
  campaigns: Campaign[]
  showCampaignPicker: boolean
  campaignPickerRef: React.RefObject<HTMLDivElement | null>
  onExport: () => void
  onImport: () => void
  onResearchSelected: () => void
  onEnrichSelected: () => void
  onAddToCampaign: (campaignId: number) => void
  onToggleCampaignPicker: () => void
}

export function LeadsToolbar({
  companiesCount, totalPeople, researchedCount, enrichedCount,
  someChecked, checkedNotStartedCount, checkedResearchedCount, checkedEnrichedCount,
  campaigns, showCampaignPicker, campaignPickerRef,
  onExport, onImport, onResearchSelected, onEnrichSelected, onAddToCampaign, onToggleCampaignPicker,
}: LeadsToolbarProps) {
  return (
    <div className="bg-card border-b border-border px-5 py-3 shrink-0">
      <div className="flex items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-sm font-semibold text-foreground">Leads</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {companiesCount} {companiesCount === 1 ? 'company' : 'companies'} ·{' '}
            {totalPeople} {totalPeople === 1 ? 'person' : 'people'} ·{' '}
            {researchedCount} researched ·{' '}
            {enrichedCount} enriched
          </p>
        </div>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>

        {someChecked && checkedResearchedCount > 0 && (
          <button
            onClick={onEnrichSelected}
            className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Enrich {checkedResearchedCount}
          </button>
        )}

        {someChecked && checkedNotStartedCount > 0 && (
          <button
            onClick={onResearchSelected}
            className="flex items-center gap-1.5 text-xs text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Research {checkedNotStartedCount}
          </button>
        )}

        {someChecked && checkedEnrichedCount > 0 && (
          <div className="relative" ref={campaignPickerRef}>
            <button
              onClick={onToggleCampaignPicker}
              className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Add to Campaign
              <ChevronDown className="h-3 w-3" />
            </button>
            {showCampaignPicker && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                {campaigns.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No campaigns yet.</p>
                ) : (
                  campaigns.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onAddToCampaign(c.id)}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className={cn(
                        'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                        c.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400' :
                        c.status === 'paused' ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {c.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onImport}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </button>
      </div>
    </div>
  )
}
