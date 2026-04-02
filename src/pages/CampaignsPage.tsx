import { useNavigate } from '@tanstack/react-router'
import { Plus, Users, Send, Eye, MessageSquare } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Campaign } from '@/types'

export function CampaignsPage() {
  const { campaigns, addCampaign } = useAppContext()
  const navigate = useNavigate()

  function handleNewCampaign() {
    const newCampaign: Omit<Campaign, 'id'> = {
      name: 'Untitled Campaign',
      status: 'draft',
      fromEmail: '',
      leads: 0,
      sent: 0,
      opens: 0,
      replies: 0,
      steps: [
        {
          id: 1,
          day: 0,
          subject: '',
          body: '',
        },
      ],
    }
    addCampaign(newCampaign)
    const nextId = campaigns.length > 0 ? Math.max(...campaigns.map(o => o.id)) + 1 : 1
    navigate({ to: '/campaigns/$campaignId', params: { campaignId: String(nextId) } })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground mr-auto">Campaigns</h1>
        <button
          onClick={handleNewCampaign}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
        {campaigns.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first campaign to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onClick={() => navigate({ to: '/campaigns/$campaignId', params: { campaignId: String(c.id) } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignCard({ campaign: c, onClick }: { campaign: Campaign; onClick: () => void }) {
  const stats = [
    { label: 'Leads', value: c.leads, icon: Users },
    { label: 'Sent', value: c.sent, icon: Send },
    { label: 'Opens', value: c.opens, icon: Eye },
    { label: 'Replies', value: c.replies, icon: MessageSquare },
  ]

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-lg px-5 py-4 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">{c.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            From: {c.fromEmail || <span className="italic">no sender set</span>} · {c.steps.length} step{c.steps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <s.icon className="h-2.5 w-2.5" /> {s.label}
            </p>
          </div>
        ))}
      </div>
    </button>
  )
}
