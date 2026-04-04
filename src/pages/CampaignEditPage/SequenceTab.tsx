import { Sparkles, Trash2, Plus } from 'lucide-react'
import { fillTokens } from '@/lib/tokens'
import { TOKEN_HINTS } from '@/data/campaigns'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignStep } from '@/types'

interface PreviewLead {
  firstName: string
  lastName: string
  company: string
  city: string
  icebreaker: string
}

interface SequenceTabProps {
  draft: Campaign
  generatingStep: string | null
  previewStepIdx: number
  previewLead: PreviewLead | null
  previewStep: CampaignStep | null
  onUpdateStep: (stepId: string, partial: Partial<CampaignStep>) => void
  onRemoveStep: (stepId: string) => void
  onAddStep: () => void
  onAiWrite: (stepIdx: number) => void
  onSetPreviewStepIdx: (idx: number) => void
}

export function SequenceTab({
  draft, generatingStep, previewStepIdx, previewLead, previewStep,
  onUpdateStep, onRemoveStep, onAddStep, onAiWrite, onSetPreviewStepIdx,
}: SequenceTabProps) {
  return (
    <>
      {/* Token hint bar */}
      <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-100 dark:border-blue-900 px-5 py-1.5 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Tokens:</span>
        {TOKEN_HINTS.map(t => (
          <code key={t} className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">{t}</code>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden bg-background">
        {/* Steps column */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {draft.steps.map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                'bg-card border rounded-lg p-4 cursor-pointer transition-colors',
                previewStepIdx === idx ? 'border-blue-300 dark:border-blue-700' : 'border-border'
              )}
              onClick={() => onSetPreviewStepIdx(idx)}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Step {idx + 1}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-muted-foreground">Day</span>
                  <input
                    type="number"
                    min={0}
                    className="w-14 text-xs border border-input rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={step.day}
                    onChange={o => onUpdateStep(step.id, { day: Number(o.target.value) })}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <button
                  onClick={async (e) => { e.stopPropagation(); await onAiWrite(idx) }}
                  disabled={generatingStep === step.id}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  {generatingStep === step.id ? 'Writing…' : 'AI Write'}
                </button>
                {draft.steps.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveStep(step.id) }}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <input
                className="w-full text-sm font-medium border-b border-border pb-1.5 mb-2 focus:outline-none focus:border-blue-400 bg-transparent text-foreground placeholder:text-muted-foreground"
                placeholder="Subject line…"
                value={step.subject}
                onChange={o => onUpdateStep(step.id, { subject: o.target.value })}
                onClick={e => e.stopPropagation()}
              />
              <textarea
                className="w-full text-xs text-foreground resize-none focus:outline-none bg-transparent leading-relaxed font-mono placeholder:text-muted-foreground"
                rows={8}
                placeholder="Email body…"
                value={step.body}
                onChange={o => onUpdateStep(step.id, { body: o.target.value })}
                onClick={e => e.stopPropagation()}
              />
            </div>
          ))}

          <button
            onClick={onAddStep}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-muted-foreground rounded-lg py-3 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add step
          </button>
        </div>

        {/* Preview panel */}
        <div className="hidden md:flex w-80 shrink-0 border-l border-border bg-muted flex-col">
          <div className="px-4 py-3 border-b border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</p>
            {previewLead && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Previewing with {previewLead.firstName} {previewLead.lastName}
              </p>
            )}
          </div>

          {previewStep && previewLead ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
                <p className="text-sm font-semibold text-foreground mb-3">
                  {fillTokens(previewStep.subject, previewLead) || <span className="text-muted-foreground font-normal italic">No subject</span>}
                </p>
                <div className="border-t border-border pt-3">
                  <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {fillTokens(previewStep.body, previewLead) || <span className="text-muted-foreground italic">No body</span>}
                  </pre>
                </div>
              </div>

              {draft.steps.length > 1 && (
                <div className="flex items-center gap-1 mt-3 justify-center">
                  {draft.steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onSetPreviewStepIdx(i)}
                      className={cn(
                        'w-6 h-6 rounded-full text-[10px] font-medium transition-colors',
                        previewStepIdx === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-border'
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              {draft.steps.length === 0 ? 'Add a step to preview' : 'No enriched lead data for preview'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
