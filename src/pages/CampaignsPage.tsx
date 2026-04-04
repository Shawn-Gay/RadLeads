import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignStatus, EmailAccount } from '@/types'

const GRID = 'grid grid-cols-[1fr_160px_80px_64px_64px_64px_64px]'

type TabKey = 'all' | CampaignStatus

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'draft',  label: 'Draft' },
]

export function CampaignsPage() {
  const { campaigns, companies, accounts, addCampaign } = useAppContext()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')

  async function handleNewCampaign() {
    const created = await addCampaign({
      name:      'Untitled Campaign',
      status:    'draft',
      senderIds: [],
      leads:     0,
      sent:      0,
      opens:     0,
      replies:   0,
      steps:     [{ id: crypto.randomUUID(), day: 0, subject: '', body: '' }],
    })
    navigate({ to: '/campaigns/$campaignId', params: { campaignId: created.id } })
  }

  const tabCounts = Object.fromEntries(
    TABS.map(t => [t.key, t.key === 'all' ? campaigns.length : campaigns.filter(o => o.status === t.key).length])
  ) as Record<TabKey, number>

  const filtered = campaigns.filter(o => {
    if (activeTab !== 'all' && o.status !== activeTab) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!o.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-card border-b border-border px-5 py-3 shrink-0 flex items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-sm font-semibold text-foreground">Campaigns</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'} ·{' '}
            {campaigns.filter(o => o.status === 'active').length} active
          </p>
        </div>
        <button
          onClick={handleNewCampaign}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border px-5 flex items-center gap-1 shrink-0 overflow-x-auto">
        {TABS.map(tab => (
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
            <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-card border-b border-border px-5 py-2 shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search campaigns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first campaign to get started.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className={cn('sticky top-0 z-10 bg-muted border-b border-border px-5 py-2 items-center', GRID)}>
              <div className="text-xs font-medium text-muted-foreground">Name</div>
              <div className="text-xs font-medium text-muted-foreground">Senders</div>
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              <div className="text-xs font-medium text-muted-foreground text-right">Leads</div>
              <div className="text-xs font-medium text-muted-foreground text-right">Sent</div>
              <div className="text-xs font-medium text-muted-foreground text-right">Opens</div>
              <div className="text-xs font-medium text-muted-foreground text-right">Replies</div>
            </div>

            {/* Rows */}
            <div className="bg-card divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <p className="text-sm text-muted-foreground">No campaigns match your filter.</p>
                  <button
                    onClick={() => { setActiveTab('all'); setSearch('') }}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : filtered.map(c => {
                const leadsCount = companies.reduce((n, o) =>
                  n + o.people.filter(p => p.campaignIds.includes(c.id)).length, 0)
                return (
                  <CampaignRow
                    key={c.id}
                    campaign={{ ...c, leads: leadsCount }}
                    accounts={accounts}
                    onClick={() => navigate({ to: '/campaigns/$campaignId', params: { campaignId: c.id } })}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CampaignRow({ campaign: c, accounts, onClick }: { campaign: Campaign; accounts: EmailAccount[]; onClick: () => void }) {
  const senders = accounts.filter(o => c.senderIds.includes(o.id))

  return (
    <div
      onClick={onClick}
      className={cn('px-5 py-3 items-center cursor-pointer hover:bg-muted/40 transition-colors', GRID)}
    >
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{c.steps.length} step{c.steps.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="min-w-0 pr-4">
        {senders.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">no senders</span>
        ) : senders.length === 1 ? (
          <p className="text-xs text-muted-foreground truncate">{senders[0].email}</p>
        ) : (
          <p className="text-xs text-muted-foreground truncate">{senders.length} inboxes</p>
        )}
      </div>
      <div><StatusBadge status={c.status} /></div>
      <div className="text-xs text-foreground text-right">{c.leads}</div>
      <div className="text-xs text-foreground text-right">{c.sent}</div>
      <div className="text-xs text-foreground text-right">{c.opens}</div>
      <div className="text-xs text-foreground text-right">{c.replies}</div>
    </div>
  )
}
