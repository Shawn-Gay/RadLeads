import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Company, LeadPerson } from '@/types'

interface PersonEntry { person: LeadPerson; company: Company }

interface AddLeadsModalProps {
  campaignId: string
  companies: Company[]
  onAdd: (personIds: string[]) => void
  onClose: () => void
}

export function AddLeadsModal({ campaignId, companies, onAdd, onClose }: AddLeadsModalProps) {
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [selectNInput, setSelectNInput] = useState('')

  const available = useMemo<PersonEntry[]>(() =>
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
    setSelectNInput('')
  }

  function applySelectN(raw: string) {
    setSelectNInput(raw)
    const n = parseInt(raw, 10)
    if (!raw.trim() || isNaN(n) || n <= 0) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(filtered.slice(0, n).map(o => o.person.id)))
  }

  const primaryEmail = (p: LeadPerson) => p.emails.find(e => e.isPrimary) ?? p.emails[0]

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
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/40">
                <div
                  onClick={toggleAll}
                  className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
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
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-muted-foreground">or first</span>
                  <input
                    type="number"
                    min={1}
                    max={filtered.length}
                    placeholder="N"
                    value={selectNInput}
                    onChange={e => applySelectN(e.target.value)}
                    className="w-14 px-1.5 py-1 text-xs bg-background border border-border rounded text-foreground text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
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
