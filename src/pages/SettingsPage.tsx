import { useState } from 'react'
import { Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAppContext } from '@/context/AppContext'

interface PurgeOptions {
  companies: boolean
  campaigns: boolean
  callLogs: boolean
  inbox: boolean
  warmupActivities: boolean
  outboundEmails: boolean
  emailAccounts: boolean
}

interface PurgeResult {
  deleted: Record<string, number>
}

const labels: Record<keyof PurgeOptions, string> = {
  companies: 'Companies, People & Emails',
  campaigns: 'Campaigns, Steps & Sends',
  callLogs: 'Call Logs',
  inbox: 'Inbox Replies',
  warmupActivities: 'Warmup Activities',
  outboundEmails: 'Outbound Emails',
  emailAccounts: 'Email Accounts',
}

const defaultOptions: PurgeOptions = {
  companies: true,
  campaigns: true,
  callLogs: true,
  inbox: true,
  warmupActivities: true,
  outboundEmails: true,
  emailAccounts: false,
}

export function SettingsPage() {
  const { setCompanies, setCampaigns, setAccounts, setWarmupActivities, setInbox } = useAppContext()
  const [options, setOptions] = useState<PurgeOptions>(defaultOptions)
  const [status, setStatus] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<PurgeResult | null>(null)
  const [error, setError] = useState('')

  const anySelected = Object.values(options).some(Boolean)

  function toggle(key: keyof PurgeOptions) {
    setOptions(o => ({ ...o, [key]: !o[key] }))
  }

  function selectAll() {
    const allOn = Object.values(options).every(Boolean)
    const next = Object.fromEntries(Object.keys(options).map(k => [k, !allOn])) as PurgeOptions
    setOptions(next)
  }

  async function handlePurge() {
    if (status !== 'confirm') {
      setStatus('confirm')
      return
    }

    setStatus('running')
    setError('')
    try {
      const res = await apiFetch<PurgeResult>('/api/admin/data', {
        method: 'DELETE',
        body: JSON.stringify(options),
      })
      setResult(res)
      setStatus('done')

      // Reset local state for purged data
      if (options.companies) setCompanies([])
      if (options.campaigns) setCampaigns([])
      if (options.emailAccounts) setAccounts([])
      if (options.warmupActivities) setWarmupActivities([])
      if (options.inbox) setInbox([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purge failed')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-card border-b border-border h-12 flex items-center px-5 shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg space-y-6">
          {/* Purge Section */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Purge Data</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Delete data from the database for iterative testing. This cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Object.values(options).every(Boolean)}
                  ref={el => {
                    if (el) el.indeterminate = !Object.values(options).every(Boolean) && anySelected
                  }}
                  onChange={selectAll}
                  className="rounded border-border"
                />
                <span className="text-xs font-medium text-foreground">Select All</span>
              </label>

              <div className="ml-4 space-y-1.5">
                {(Object.keys(labels) as (keyof PurgeOptions)[]).map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={() => toggle(key)}
                      className="rounded border-border"
                    />
                    <span className="text-xs text-foreground">{labels[key]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handlePurge}
                disabled={!anySelected || status === 'running'}
                className={
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ' +
                  (status === 'confirm'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900')
                }
              >
                {status === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {status === 'confirm' ? 'Click again to confirm' : status === 'running' ? 'Purging…' : 'Purge Selected Data'}
              </button>

              {status === 'confirm' && (
                <button
                  onClick={() => setStatus('idle')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Result */}
            {status === 'done' && result && (
              <div className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950 p-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <div className="text-xs text-green-800 dark:text-green-300 space-y-0.5">
                  <p className="font-medium">Purge complete</p>
                  {Object.entries(result.deleted).map(([table, count]) => (
                    <p key={table}>{table}: {count} deleted</p>
                  ))}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950 p-3">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
