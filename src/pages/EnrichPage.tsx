import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle, XCircle, Loader2, Plus } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { LeadDetailPanel } from '@/components/leads/LeadDetailPanel'
import { enrichDomain } from '@/services/enrichment'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'

type DomainStatus = 'pending' | 'loading' | 'done' | 'error'

interface DomainResult {
  domain: string
  status: DomainStatus
  lead: Omit<Lead, 'id' | 'status' | 'score' | 'lastTouched'> | null
  error: string | null
}

const COST_PER_DOMAIN = 0.04

export function EnrichPage() {
  const { addLeads } = useAppContext()
  const navigate = useNavigate()
  const [textarea, setTextarea] = useState('')
  const [results, setResults] = useState<DomainResult[]>([])
  const [running, setRunning] = useState(false)
  const [selectedResult, setSelectedResult] = useState<DomainResult | null>(null)
  const abortRef = useRef(false)

  const domains = textarea.trim() ? textarea.trim().split('\n').map(o => o.trim()).filter(Boolean) : []
  const doneCount = results.filter(o => o.status === 'done').length
  const allDone = results.length > 0 && results.every(o => o.status === 'done' || o.status === 'error')

  async function handleEnrich() {
    if (domains.length === 0) return
    abortRef.current = false
    const initial: DomainResult[] = domains.map(d => ({
      domain: d,
      status: 'pending',
      lead: null,
      error: null,
    }))
    setResults(initial)
    setSelectedResult(null)
    setRunning(true)

    for (let i = 0; i < domains.length; i++) {
      if (abortRef.current) break
      const domain = domains[i]

      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r))

      try {
        const abortController = new AbortController()
        const checkAbort = () => {
          if (abortRef.current) abortController.abort()
        }
        const interval = setInterval(checkAbort, 100)
        const lead = await enrichDomain(domain, abortController.signal)
        clearInterval(interval)
        if (abortRef.current) break
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'done', lead } : r
        ))
      } catch (err) {
        if (abortRef.current) break
        const msg = err instanceof Error ? err.message : 'Enrichment failed'
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error', error: msg } : r
        ))
      }
    }

    setRunning(false)
  }

  function handleStop() {
    abortRef.current = true
    setRunning(false)
  }

  function handleClear() {
    setTextarea('')
    setResults([])
    setSelectedResult(null)
    abortRef.current = true
    setRunning(false)
  }

  function handleAddLeads() {
    const newLeads = results
      .filter(o => o.status === 'done' && o.lead !== null)
      .map(o => o.lead!)
    addLeads(newLeads)
    navigate({ to: '/leads' })
  }

  const previewLead = selectedResult?.lead
    ? {
        ...selectedResult.lead,
        id: 0,
        status: 'new' as const,
        score: 0,
        lastTouched: new Date().toISOString().slice(0, 10),
      }
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Enrich Leads</h1>
      </div>

      <div className="relative flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left panel */}
        <div className="md:w-64 md:shrink-0 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col p-4 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">
              Domains to enrich
            </label>
            <textarea
              className="w-full h-32 md:h-40 text-xs rounded-md border border-input px-2.5 py-2 resize-none font-mono bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={"peakroofing.com\nsummitshield.com\nreliableroof.co"}
              value={textarea}
              onChange={o => setTextarea(o.target.value)}
              disabled={running}
            />
          </div>

          {domains.length > 0 && (
            <div className="bg-muted rounded-md px-3 py-2 text-xs text-foreground">
              <p><span className="font-medium">{domains.length}</span> domain{domains.length !== 1 ? 's' : ''}</p>
              <p className="text-muted-foreground mt-0.5">Est. cost: ${(domains.length * COST_PER_DOMAIN).toFixed(2)}</p>
            </div>
          )}

          {running && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{results.filter(o => o.status !== 'pending' && o.status !== 'loading').length}/{results.length}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${(results.filter(o => o.status !== 'pending' && o.status !== 'loading').length / results.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            {allDone && doneCount > 0 && (
              <button
                onClick={handleAddLeads}
                className="flex items-center justify-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-md transition-colors font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Add {doneCount} lead{doneCount !== 1 ? 's' : ''}
              </button>
            )}
            {running ? (
              <button
                onClick={handleStop}
                className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleEnrich}
                disabled={domains.length === 0}
                className="text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-md transition-colors"
              >
                Enrich {domains.length > 0 ? `${domains.length} domain${domains.length !== 1 ? 's' : ''}` : ''}
              </button>
            )}
            {results.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Center: results */}
        <div className="flex-1 overflow-y-auto bg-background">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Enter domains on the left and click Enrich to get started.
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => r.status === 'done' ? setSelectedResult(
                    selectedResult?.domain === r.domain ? null : r
                  ) : undefined}
                  className={cn(
                    'w-full text-left bg-card border rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors',
                    r.status === 'done' ? 'hover:bg-muted cursor-pointer' : 'cursor-default',
                    selectedResult?.domain === r.domain
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950'
                      : 'border-border'
                  )}
                >
                  <StatusDot status={r.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{r.domain}</p>
                    {r.status === 'done' && r.lead && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.lead.firstName} {r.lead.lastName} · {r.lead.company}
                      </p>
                    )}
                    {r.status === 'error' && (
                      <p className="text-xs text-red-500 mt-0.5">{r.error}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {previewLead && (
          <LeadDetailPanel
            lead={previewLead}
            onClose={() => setSelectedResult(null)}
          />
        )}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: DomainStatus }) {
  if (status === 'loading') {
    return <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
  }
  if (status === 'done') {
    return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
  }
  if (status === 'error') {
    return <XCircle className="h-4 w-4 text-red-400 shrink-0" />
  }
  return <span className="w-4 h-4 rounded-full bg-muted shrink-0" />
}
