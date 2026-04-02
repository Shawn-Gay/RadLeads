import { Users, TrendingUp, MessageSquare, Server } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const { leads, campaigns, accounts } = useAppContext()

  const totalLeads = leads.length
  const repliedLeads = leads.filter(o => o.status === 'replied' || o.status === 'hot').length
  const contactedLeads = leads.filter(o => o.status === 'contacted' || o.status === 'replied' || o.status === 'hot').length
  const openRate = contactedLeads > 0 ? Math.round((repliedLeads / contactedLeads) * 100) : 0
  const activeAccounts = accounts.filter(o => o.status === 'active').length
  const recentLeads = [...leads].sort((a, b) => b.id - a.id).slice(0, 5)

  const stats = [
    {
      label: 'Total Leads',
      value: String(totalLeads),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Open Rate',
      value: contactedLeads > 0 ? `${openRate}%` : '—',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      label: 'Replies',
      value: String(repliedLeads),
      icon: MessageSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      label: 'Active Accounts',
      value: String(activeAccounts),
      icon: Server,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your cold email activity.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <span className={cn('p-1.5 rounded-md', stat.bg)}>
                <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 2-col widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Active campaigns widget */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Campaigns</h2>
            <Link to="/campaigns" className="text-xs text-blue-600 hover:text-blue-700 dark:hover:text-blue-400">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {campaigns.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No campaigns yet.</p>
            ) : campaigns.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.leads} leads · {c.sent} sent</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Email accounts widget */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Email Accounts</h2>
            <Link to="/accounts" className="text-xs text-blue-600 hover:text-blue-700 dark:hover:text-blue-400">Manage</Link>
          </div>
          <div className="divide-y divide-border">
            {accounts.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  a.status === 'active' ? 'bg-emerald-500' :
                  a.status === 'warming' ? 'bg-amber-400' : 'bg-muted-foreground'
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{a.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.sentToday}/{a.dailyLimit} today</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Leads</h2>
          <Link to="/leads" className="text-xs text-blue-600 hover:text-blue-700 dark:hover:text-blue-400">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {recentLeads.map(lead => (
            <div key={lead.id} className="px-4 py-3 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{lead.firstName} {lead.lastName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{lead.company} · {lead.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{lead.lastTouched}</span>
                <StatusBadge status={lead.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
