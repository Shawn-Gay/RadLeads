import { Users, Sparkles, Megaphone, Server } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const { companies, campaigns, accounts } = useAppContext()

  const totalPeople    = companies.reduce((n, o) => n + o.people.length, 0)
  const enrichedCount  = companies.filter(o => o.enrichStatus === 'enriched').length
  const inCampaignCount = companies.reduce((n, o) => n + o.people.filter(p => p.campaignIds.length > 0).length, 0)
  const activeAccounts = accounts.filter(o => o.status === 'active').length

  const stats = [
    {
      label: 'Total Leads',
      value: String(totalPeople),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Enriched Companies',
      value: `${enrichedCount} / ${companies.length}`,
      icon: Sparkles,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950',
    },
    {
      label: 'In Campaign',
      value: String(inCampaignCount),
      icon: Megaphone,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      label: 'Active Accounts',
      value: String(activeAccounts),
      icon: Server,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ]

  // Recent companies: enriched first, then by name
  const recentCompanies = [...companies]
    .sort((a, b) => {
      if (a.enrichStatus === 'enriched' && b.enrichStatus !== 'enriched') return -1
      if (b.enrichStatus === 'enriched' && a.enrichStatus !== 'enriched') return 1
      return 0
    })
    .slice(0, 5)

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your cold email activity.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
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
        {/* Active campaigns */}
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

        {/* Email accounts */}
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

      {/* Recent companies */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Leads</h2>
          <Link to="/leads" className="text-xs text-blue-600 hover:text-blue-700 dark:hover:text-blue-400">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {recentCompanies.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No leads yet. Import a CSV to get started.</p>
          ) : recentCompanies.map(company => {
            const enrichCls = {
              enriched:     'text-emerald-600',
              enriching:    'text-violet-600',
              researched:   'text-sky-600',
              researching:  'text-amber-600',
              not_enriched: 'text-muted-foreground',
              failed:       'text-red-600',
            }[company.enrichStatus]

            return (
              <div key={company.id} className="px-4 py-3 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{company.domain}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {company.name} · {company.people.length} {company.people.length === 1 ? 'person' : 'people'}
                  </p>
                </div>
                <span className={cn('text-xs font-medium capitalize', enrichCls)}>
                  {company.enrichStatus.replace('_', ' ')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
