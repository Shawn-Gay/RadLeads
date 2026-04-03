import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronLeft, Sparkles, Trash2, Plus, Users, Search, X, UserMinus } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { fillTokens } from '@/lib/tokens'
import { generateCampaignStep } from '@/services/ai'
import { TOKEN_HINTS } from '@/data/campaigns'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignStep, Company, LeadPerson } from '@/types'

// ─── Add Leads Modal ──────────────────────────────────────────────────────────

interface PersonRow { person: LeadPerson; company: Company }

function AddLeadsModal({
  campaignId,
  companies,
  onAdd,
  onClose,
}: {
  campaignId: number
  companies: Company[]
  onAdd: (personIds: string[]) => void
  onClose: () => void
}) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = useMemo<PersonRow[]>(() =>
    companies.flatMap(o =>
      o.people
        .filter(p => !p.campaignIds.includes(campaignId))
        .map(p => ({ person: p, company: o }))
    ), [companies, campaignId])

  const filtered = useMemo(() => {
    if (!search.trim()) return available
    const q = search.toLowerCase()
    return available.filter(o =>
      `${o.person.firstName} ${o.person.lastName}`.toLowerCase().includes(q) ||
      o.company.domain.includes(q) ||
      o.company.name.toLowerCase().includes(q)
    )
  }, [available, search])

  function toggle(personId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(personId) ? next.delete(personId) : next.add(personId)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(o => o.person.id)))
    }
  }

  const primaryEmail = (p: LeadPerson) =>
    p.emails.find(e => e.isPrimary) ?? p.emails[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add Leads</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {available.length} people available · only enriched leads appear here
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, domain…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-muted-foreground">
              {available.length === 0
                ? 'All enriched leads are already in this campaign.'
                : 'No leads match your search.'}
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div
                onClick={toggleAll}
                className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selected.size === filtered.length && filtered.length > 0}
                  className="w-4 h-4 rounded accent-blue-600 dark:[color-scheme:dark] cursor-pointer"
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {selected.size === filtered.length ? 'Deselect all' : `Select all (${filtered.length})`}
                </span>
              </div>

              {filtered.map(({ person, company }) => {
                const email = primaryEmail(person)
                const isSelected = selected.has(person.id)
                return (
                  <div
                    key={person.id}
                    onClick={() => toggle(person.id)}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0',
                      isSelected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-muted/40'
                    )}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={isSelected}
                      className="w-4 h-4 rounded accent-blue-600 dark:[color-scheme:dark] cursor-pointer shrink-0"
                    />
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {person.firstName[0]}{person.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {person.firstName} {person.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {person.title} · {company.domain}
                      </p>
                    </div>
                    {email && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[140px] shrink-0">
                        {email.address}
                      </span>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : 'None selected'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={selected.size === 0}
              onClick={() => { onAdd([...selected]); onClose() }}
              className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add {selected.size > 0 ? selected.size : ''} to Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Audience Tab ─────────────────────────────────────────────────────────────

function AudienceTab({
  campaignId,
  companies,
  onRemove,
  onOpenAddLeads,
}: {
  campaignId: number
  companies: Company[]
  onRemove: (personId: string) => void
  onOpenAddLeads: () => void
}) {
  const audience = useMemo<PersonRow[]>(() =>
    companies.flatMap(o =>
      o.people
        .filter(p => p.campaignIds.includes(campaignId))
        .map(p => ({ person: p, company: o }))
    ), [companies, campaignId])

  const primaryEmail = (p: LeadPerson) =>
    p.emails.find(e => e.isPrimary) ?? p.emails[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Audience header */}
      <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <p className="text-xs text-muted-foreground mr-auto">
          {audience.length} {audience.length === 1 ? 'person' : 'people'} in this campaign
        </p>
        <button
          onClick={onOpenAddLeads}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Leads
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-background">
        {audience.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No leads yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add enriched leads to start sending this campaign.
              </p>
            </div>
            <button
              onClick={onOpenAddLeads}
              className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Leads
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {audience.map(({ person, company }) => {
              const email = primaryEmail(person)
              return (
                <div key={person.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 group transition-colors">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {person.firstName[0]}{person.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {person.firstName} {person.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.title} · {company.domain}
                    </p>
                  </div>
                  {email && (
                    <span className="text-xs text-muted-foreground truncate max-w-[180px] shrink-0 hidden sm:block">
                      {email.address}
                    </span>
                  )}
                  <button
                    onClick={() => onRemove(person.id)}
                    title="Remove from campaign"
                    className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabKey = 'sequence' | 'audience'

export function CampaignEditPage() {
  const params = useParams({ strict: false }) as { campaignId?: string }
  const { campaigns, companies, accounts, updateCampaign, addPersonToCampaign, removePersonFromCampaign } = useAppContext()

  const campaignId = Number(params.campaignId)
  const source = campaigns.find(o => o.id === campaignId)

  const [draft, setDraft]               = useState<Campaign | null>(source ?? null)
  const [generatingStep, setGeneratingStep] = useState<number | null>(null)
  const [previewStepIdx, setPreviewStepIdx] = useState(0)
  const [activeTab, setActiveTab]       = useState<TabKey>('sequence')
  const [showAddLeads, setShowAddLeads] = useState(false)

  useEffect(() => {
    if (source && !draft) setDraft(source)
  }, [source, draft])

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Campaign not found.
      </div>
    )
  }

  const audienceCount = companies.reduce((n, o) =>
    n + o.people.filter(p => p.campaignIds.includes(campaignId)).length, 0)

  // Preview token data from first enriched person
  const firstPerson = companies
    .flatMap(o => o.people.map(p => ({ ...p, company: o })))
    .find(p => p.company.enrichStatus === 'enriched')
  const previewLead = firstPerson
    ? {
        firstName: firstPerson.firstName,
        lastName: firstPerson.lastName,
        company: firstPerson.company.name,
        city: firstPerson.city ?? '',
        icebreaker: firstPerson.icebreaker ?? '',
      }
    : null

  function save(updated: Campaign) {
    setDraft(updated)
    updateCampaign(updated)
  }

  function updateStep(stepId: number, partial: Partial<CampaignStep>) {
    save({
      ...draft!,
      steps: draft!.steps.map(o => o.id === stepId ? { ...o, ...partial } : o),
    })
  }

  function removeStep(stepId: number) {
    save({ ...draft!, steps: draft!.steps.filter(o => o.id !== stepId) })
    if (previewStepIdx >= draft!.steps.length - 1) setPreviewStepIdx(Math.max(0, previewStepIdx - 1))
  }

  function addStep() {
    const nextId = draft!.steps.length > 0 ? Math.max(...draft!.steps.map(o => o.id)) + 1 : 1
    const lastDay = draft!.steps.length > 0 ? draft!.steps[draft!.steps.length - 1].day : 0
    save({
      ...draft!,
      steps: [...draft!.steps, { id: nextId, day: lastDay + 3, subject: '', body: '' }],
    })
  }

  async function handleAiWrite(stepIdx: number) {
    const step = draft!.steps[stepIdx]
    setGeneratingStep(step.id)
    try {
      const result = await generateCampaignStep(stepIdx, draft!.steps.length, step.day)
      updateStep(step.id, result)
    } finally {
      setGeneratingStep(null)
    }
  }

  function toggleStatus() {
    const next = draft!.status === 'active' ? 'paused' : 'active'
    save({ ...draft!, status: next })
  }

  const previewStep = draft.steps[previewStepIdx]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
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
          onChange={o => save({ ...draft, name: o.target.value })}
        />
        <StatusBadge status={draft.status} className="shrink-0" />

        <select
          className="text-xs text-foreground border border-input rounded-md px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
          value={draft.fromEmail}
          onChange={o => save({ ...draft, fromEmail: o.target.value })}
        >
          <option value="">— select sender —</option>
          {accounts.map(o => <option key={o.email} value={o.email}>{o.email}</option>)}
        </select>

        <button
          onClick={toggleStatus}
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

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-5 flex items-center gap-1 shrink-0">
        {([
          { key: 'sequence', label: 'Sequence' },
          { key: 'audience', label: `Audience${audienceCount > 0 ? ` (${audienceCount})` : ''}` },
        ] as { key: TabKey; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Sequence tab ── */}
      {activeTab === 'sequence' && (
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
                  onClick={() => setPreviewStepIdx(idx)}
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
                        onChange={o => updateStep(step.id, { day: Number(o.target.value) })}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <button
                      onClick={async (e) => { e.stopPropagation(); await handleAiWrite(idx) }}
                      disabled={generatingStep === step.id}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      {generatingStep === step.id ? 'Writing…' : 'AI Write'}
                    </button>
                    {draft.steps.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); removeStep(step.id) }}
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
                    onChange={o => updateStep(step.id, { subject: o.target.value })}
                    onClick={e => e.stopPropagation()}
                  />
                  <textarea
                    className="w-full text-xs text-foreground resize-none focus:outline-none bg-transparent leading-relaxed font-mono placeholder:text-muted-foreground"
                    rows={8}
                    placeholder="Email body…"
                    value={step.body}
                    onChange={o => updateStep(step.id, { body: o.target.value })}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              ))}

              <button
                onClick={addStep}
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
                          onClick={() => setPreviewStepIdx(i)}
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
      )}

      {/* ── Audience tab ── */}
      {activeTab === 'audience' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <AudienceTab
            campaignId={campaignId}
            companies={companies}
            onRemove={personId => removePersonFromCampaign(personId, campaignId)}
            onOpenAddLeads={() => setShowAddLeads(true)}
          />
        </div>
      )}

      {/* ── Add Leads modal ── */}
      {showAddLeads && (
        <AddLeadsModal
          campaignId={campaignId}
          companies={companies}
          onAdd={personIds => personIds.forEach(id => addPersonToCampaign(id, campaignId))}
          onClose={() => setShowAddLeads(false)}
        />
      )}
    </div>
  )
}
