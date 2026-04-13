import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/AppContext'
import type { Dialer } from '@/types'

interface DialerIdentityModalProps {
  onSelect: (dialer: Dialer) => void
}

export function DialerIdentityModal({ onSelect }: DialerIdentityModalProps) {
  const { dialers, addDialer } = useAppContext()
  const [newName, setNewName]   = useState('')
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew]   = useState(false)

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      const dialer = await addDialer(trimmed)
      onSelect(dialer)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Who's dialing?</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Select your name to track your queue.</p>
        </div>

        <div className="p-4 space-y-1.5 max-h-64 overflow-y-auto">
          {dialers.map(o => (
            <button
              key={o.id}
              onClick={() => onSelect(o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                {o.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground">{o.name}</span>
              <Check className="h-4 w-4 text-blue-500 ml-auto opacity-0 group-hover:opacity-100" />
            </button>
          ))}

          {dialers.length === 0 && !showNew && (
            <p className="text-xs text-muted-foreground text-center py-4">No dialers yet — add one below.</p>
          )}
        </div>

        <div className="px-4 pb-4 border-t border-border pt-4">
          {showNew ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder="Your name"
                className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className={cn(
                  'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium transition-colors',
                  'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {creating ? '…' : 'Add'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:bg-muted transition-colors text-sm text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              Add new dialer
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
