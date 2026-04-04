import { cn } from '@/lib/utils'
import { useCampaignEdit } from './useCampaignEdit'
import { CampaignTopbar } from './CampaignTopbar'
import { SequenceTab } from './SequenceTab'
import { AudienceTab } from './AudienceTab'
import { SendersTab } from './SendersTab'
import { AddLeadsModal } from './AddLeadsModal'
import type { TabKey } from './useCampaignEdit'

const TABS: { key: TabKey; label: (audienceCount: number, senderCount: number) => string }[] = [
  { key: 'sequence', label: () => 'Sequence' },
  { key: 'senders',  label: (_, n) => `Senders${n > 0 ? ` (${n})` : ''}` },
  { key: 'audience', label: n => `Audience${n > 0 ? ` (${n})` : ''}` },
]

export function CampaignEditPage() {
  const state = useCampaignEdit()

  if (!state.draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Campaign not found.
      </div>
    )
  }

  const { draft } = state

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CampaignTopbar
        draft={draft}
        onSave={state.save}
        onToggleStatus={state.toggleStatus}
      />

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-5 flex items-center gap-1 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => state.setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              state.activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label(state.audienceCount, state.senderCount)}
          </button>
        ))}
      </div>

      {state.activeTab === 'sequence' && (
        <SequenceTab
          draft={draft}
          generatingStep={state.generatingStep}
          previewStepIdx={state.previewStepIdx}
          previewLead={state.previewLead}
          previewStep={state.previewStep}
          onUpdateStep={state.updateStep}
          onRemoveStep={state.removeStep}
          onAddStep={state.addStep}
          onAiWrite={state.handleAiWrite}
          onSetPreviewStepIdx={state.setPreviewStepIdx}
        />
      )}

      {state.activeTab === 'senders' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SendersTab
            draft={draft}
            accounts={state.accounts}
            onSave={state.save}
          />
        </div>
      )}

      {state.activeTab === 'audience' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <AudienceTab
            campaignId={state.campaignId}
            companies={state.companies}
            onRemove={personId => state.removePersonFromCampaign(personId, state.campaignId)}
            onOpenAddLeads={() => state.setShowAddLeads(true)}
          />
        </div>
      )}

      {state.showAddLeads && (
        <AddLeadsModal
          campaignId={state.campaignId}
          companies={state.companies}
          onAdd={personIds => state.enrollPeople(personIds)}
          onClose={() => state.setShowAddLeads(false)}
        />
      )}
    </div>
  )
}
