import { useState } from 'react'
import { PhoneCall } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/context/AppContext'
import type { Dialer } from '@/types'

interface AssignLeadsModalProps {
  dialer: Dialer
  currentAssignedCount: number
  onAssigned: () => void
  onCancel: () => void
}

const CAP = 50

export function AssignLeadsModal({ dialer, currentAssignedCount, onAssigned, onCancel }: AssignLeadsModalProps) {
  const { assignCompaniesToDialer } = useAppContext()
  const available = CAP - currentAssignedCount
  const [count, setCount]     = useState(Math.min(20, available))
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleAssign() {
    setLoading(true)
    setError(null)
    try {
      await assignCompaniesToDialer(dialer.id, count)
      onAssigned()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to assign leads.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Assign leads</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dialing as <span className="font-medium text-foreground">{dialer.name}</span>
            {currentAssignedCount > 0 && (
              <> · {currentAssignedCount} already assigned</>
            )}
          </p>
        </div>

        <div className="px-6 py-6">
          <label className="block text-xs font-medium text-muted-foreground mb-3">
            How many leads do you want to dial today?
          </label>

          <div className="flex items-center gap-4 mb-2">
            <input
              type="range"
              min={1}
              max={available}
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              disabled={available === 0}
              className="flex-1 accent-blue-600"
            />
            <span className="text-2xl font-bold text-foreground w-10 text-center tabular-nums">
              {count}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {available === 0
              ? `At cap (${CAP}). Drop some leads first.`
              : `Up to ${available} available (cap: ${CAP})`
            }
          </p>

          {error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || available === 0}
            className={cn(
              'flex-1 py-2.5 text-sm rounded-xl bg-blue-600 text-white font-medium transition-colors',
              'hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            <PhoneCall className="h-4 w-4" />
            {loading ? 'Assigning…' : 'Start Dialing'}
          </button>
        </div>

      </div>
    </div>
  )
}
