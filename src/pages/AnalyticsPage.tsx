import { useEffect, useState } from 'react'
import { BarChart3, ScrollText, Loader2, Timer } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { getScriptStats } from '@/services/scripts'
import { getCallSessions } from '@/services/callSessions'
import type { ScriptStats, ScriptStatsPerDialer, CallSessionListItem } from '@/types'

type TabId = 'scripts' | 'sessions'

interface Tab {
  id: TabId
  label: string
  icon: typeof ScrollText
}

const tabs: Tab[] = [
  { id: 'scripts',  label: 'Scripts',  icon: ScrollText },
  { id: 'sessions', label: 'Sessions', icon: Timer },
]

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('scripts')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-card border-b border-border h-12 flex items-center px-5 shrink-0 gap-2">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        <h1 className="text-sm font-semibold text-foreground">Analytics</h1>
      </div>

      <div className="bg-card border-b border-border flex items-center px-3 shrink-0">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ' +
                (active
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground')
              }
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'scripts'  && <ScriptsAnalytics />}
        {activeTab === 'sessions' && <SessionsAnalytics />}
      </div>
    </div>
  )
}

function ScriptsAnalytics() {
  const { scripts, dialers } = useAppContext()
  const nonArchived = scripts.filter(o => !o.isArchived)

  const [selectedId, setSelectedId] = useState<string | null>(() => nonArchived[0]?.id ?? null)
  const [dialerFilter, setDialerFilter] = useState<string>('all')
  const [stats, setStats] = useState<ScriptStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedId && nonArchived.length > 0) {
      setSelectedId(nonArchived[0].id)
    }
  }, [nonArchived, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setStats(null)
      return
    }
    setLoading(true)
    const dialerId = dialerFilter === 'all' ? undefined : dialerFilter
    getScriptStats(selectedId, dialerId)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [selectedId, dialerFilter])

  const selected = scripts.find(o => o.id === selectedId) ?? null

  return (
    <div className="flex h-full min-h-0">
      {/* Script list */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Scripts</span>
          <span className="text-xs text-muted-foreground"> · {nonArchived.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {nonArchived.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No scripts yet.</p>
          ) : (
            nonArchived.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={
                  'w-full text-left px-3 py-2 text-xs border-b border-border transition-colors ' +
                  (selectedId === o.id
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'text-foreground hover:bg-muted')
                }
              >
                <span className="font-medium truncate block">{o.name}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Select a script to view analytics.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">{selected.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {new Date(selected.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Dialer:</label>
                <select
                  value={dialerFilter}
                  onChange={e => setDialerFilter(e.target.value)}
                  className="text-xs rounded-md border border-border bg-card px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All dialers</option>
                  {dialers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-foreground">Performance</h3>
                {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>

              {stats && (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total calls</div>
                    <div className="text-2xl font-semibold text-foreground">{stats.totalCalls}</div>
                  </div>

                  <OutcomeBreakdown counts={stats.outcomeCounts} total={stats.totalCalls} />

                  {dialerFilter === 'all' && (
                    <div className="pt-2 border-t border-border">
                      <h4 className="text-xs font-semibold text-foreground mb-2">Per Dialer</h4>
                      {stats.perDialer.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No dialer-attributed calls yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {stats.perDialer.map(o => (
                            <DialerStatsRow key={o.dialerId} row={o} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <DialerUsage scriptId={selected.id} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OutcomeBreakdown({ counts, total }: { counts: Record<string, number>, total: number }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">No outcomes yet.</p>
  return (
    <div className="space-y-1.5">
      {entries.map(([outcome, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={outcome} className="flex items-center gap-3">
            <span className="text-xs text-foreground w-28 truncate">{outcome}</span>
            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">{count} · {pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function DialerStatsRow({ row }: { row: ScriptStatsPerDialer }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-foreground">{row.dialerName}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{row.totalCalls} calls</span>
      </div>
      <OutcomeBreakdown counts={row.outcomeCounts} total={row.totalCalls} />
    </div>
  )
}

function DialerUsage({ scriptId }: { scriptId: string }) {
  const { dialers } = useAppContext()
  const users = dialers.filter(o => o.selectedScriptId === scriptId)
  if (users.length === 0) return null
  return (
    <div className="pt-2 border-t border-border">
      <h4 className="text-xs font-semibold text-foreground mb-2">Currently selected by</h4>
      <div className="flex flex-wrap gap-1.5">
        {users.map(o => (
          <span key={o.id} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {o.name}
          </span>
        ))}
      </div>
    </div>
  )
}

function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function sessionElapsedSeconds(s: CallSessionListItem): number | null {
  if (!s.endedAt) return null
  return Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
}

function SessionsAnalytics() {
  const { dialers } = useAppContext()
  const [dialerFilter, setDialerFilter] = useState<string>('all')
  const [sessions, setSessions] = useState<CallSessionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    const id = dialerFilter === 'all' ? undefined : dialerFilter
    getCallSessions(id)
      .then(setSessions)
      .catch(err => setFetchError(String(err)))
      .finally(() => setLoading(false))
  }, [dialerFilter])

  const ended = sessions.filter(o => o.endedAt)
  const totalCalls    = sessions.reduce((acc, o) => acc + o.leadsCalledCount, 0)
  const totalActive   = ended.reduce((acc, o) => {
    const elapsed = sessionElapsedSeconds(o)
    return elapsed !== null ? acc + elapsed - o.totalPausedSeconds : acc
  }, 0)
  const avgCalls = ended.length > 0 ? (totalCalls / ended.length).toFixed(1) : '—'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-foreground">Call Sessions</h2>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Dialer:</label>
            <select
              value={dialerFilter}
              onChange={e => setDialerFilter(e.target.value)}
              className="text-xs rounded-md border border-border bg-card px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All dialers</option>
              {dialers.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total sessions', value: sessions.length },
            { label: 'Completed',      value: ended.length },
            { label: 'Total active',   value: totalActive > 0 ? fmtDuration(totalActive) : '—' },
            { label: 'Avg calls/session', value: avgCalls },
          ].map(o => (
            <div key={o.label} className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">{o.label}</div>
              <div className="text-xl font-semibold text-foreground tabular-nums">{o.value}</div>
            </div>
          ))}
        </div>

        {fetchError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-xs text-red-700 dark:text-red-400">
            Failed to load sessions: {fetchError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] text-[11px] font-semibold text-muted-foreground px-4 py-2 border-b border-border bg-muted/40 gap-4">
            <span>Started</span>
            <span className="w-28 text-right">Dialer</span>
            <span className="w-20 text-right">Duration</span>
            <span className="w-20 text-right">Active</span>
            <span className="w-16 text-right">Paused</span>
            <span className="w-12 text-right">Calls</span>
          </div>

          {sessions.length === 0 && !loading && (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">No sessions found.</p>
          )}

          {sessions.map(o => {
            const elapsed  = sessionElapsedSeconds(o)
            const active   = elapsed !== null ? elapsed - o.totalPausedSeconds : null
            const started  = new Date(o.startedAt)
            const dateStr  = started.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            const timeStr  = started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

            return (
              <div
                key={o.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-4 py-2.5 border-b border-border last:border-0 gap-4 text-xs"
              >
                <div>
                  <span className="text-foreground font-medium">{dateStr}</span>
                  <span className="text-muted-foreground ml-1.5">{timeStr}</span>
                  {!o.endedAt && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                      In progress
                    </span>
                  )}
                </div>
                <span className="w-28 text-right text-muted-foreground truncate">
                  {o.dialerName ?? '—'}
                </span>
                <span className="w-20 text-right tabular-nums text-foreground">
                  {elapsed !== null ? fmtDuration(elapsed) : '—'}
                </span>
                <span className="w-20 text-right tabular-nums text-foreground">
                  {active !== null ? fmtDuration(Math.max(0, active)) : '—'}
                </span>
                <span className="w-16 text-right tabular-nums text-muted-foreground">
                  {o.totalPausedSeconds > 0 ? fmtDuration(o.totalPausedSeconds) : '—'}
                </span>
                <span className="w-12 text-right tabular-nums font-medium text-foreground">
                  {o.leadsCalledCount}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
