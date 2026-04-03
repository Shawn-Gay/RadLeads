import { useState } from 'react'
import { X, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailAccount, WarmupBatch } from '@/types'

interface ManageBatchModalProps {
  /** null = creating a new batch */
  batch: WarmupBatch | null
  accounts: EmailAccount[]
  onSave: (batchId: string | null, name: string, accountIds: number[]) => void
  onDelete: (batchId: string) => void
  onClose: () => void
}

export function ManageBatchModal({ batch, accounts, onSave, onDelete, onClose }: ManageBatchModalProps) {
  const isNew = batch === null
  const [name, setName] = useState(batch?.name ?? `Batch ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`)
  const [selected, setSelected] = useState<Set<number>>(
    new Set(accounts.filter(o => o.warmupBatchId === batch?.id).map(o => o.id))
  )
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleAccount(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSave() {
    if (!name.trim()) return
    onSave(batch?.id ?? null, name.trim(), [...selected])
    onClose()
  }

  function handleDelete() {
    if (!batch) return
    onDelete(batch.id)
    onClose()
  }

  // Show all accounts that are either unassigned, currently in this batch, or in warming status
  const eligible = accounts.filter(o =>
    o.warmupBatchId === null ||
    o.warmupBatchId === batch?.id
  )

  // Accounts in OTHER batches — shown separately, can't be stolen without removing first
  const inOtherBatch = accounts.filter(o =>
    o.warmupBatchId !== null && o.warmupBatchId !== batch?.id
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-foreground">
              {isNew ? 'New Warmup Batch' : `Edit Batch`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Batch name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Batch name</label>
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Batch A"
              value={name}
              onChange={o => setName(o.target.value)}
            />
          </div>

          {/* Account selection */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Select accounts to warm up together
              <span className="ml-1 text-[10px] font-normal">(accounts send warmup emails to each other)</span>
            </p>

            {eligible.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                No available accounts. Connect more inboxes first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {eligible.map(account => {
                  const isChecked = selected.has(account.id)
                  return (
                    <label
                      key={account.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none',
                        isChecked
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40'
                          : 'border-border hover:bg-muted/60'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAccount(account.id)}
                        className="w-4 h-4 rounded accent-amber-500 dark:[color-scheme:dark] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{account.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {account.provider} · {account.status}
                          {account.warmupDay !== null && ` · day ${account.warmupDay}`}
                        </p>
                      </div>
                      {account.health !== null && (
                        <span className={cn(
                          'text-[10px] font-semibold shrink-0',
                          account.health >= 80 ? 'text-emerald-600' : account.health >= 60 ? 'text-amber-600' : 'text-red-500'
                        )}>
                          {account.health}%
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}

            {inOtherBatch.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">In another batch</p>
                <div className="space-y-1">
                  {inOtherBatch.map(account => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border opacity-50"
                    >
                      <div className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{account.email}</p>
                        <p className="text-[10px] text-muted-foreground">Assigned to {account.warmupBatchId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Warmup info callout */}
          <div className="bg-muted/60 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">How warmup works:</strong> Accounts in the same batch send emails to each other, mark them as not spam, read and occasionally star them, then reply back and forth 3–6 times per thread. This builds sender reputation gradually.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
          {!isNew && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete batch
            </button>
          )}

          {!isNew && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Remove all accounts from this batch?</span>
              <button onClick={handleDelete} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          )}

          {(isNew || (!isNew && !confirmDelete)) && (
            <div className={cn('flex items-center gap-2', isNew && 'ml-auto')}>
              <span className="text-xs text-muted-foreground">{selected.size} account{selected.size !== 1 ? 's' : ''} selected</span>
              <button
                onClick={handleSave}
                disabled={!name.trim() || selected.size < 2}
                className="text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors"
                title={selected.size < 2 ? 'Select at least 2 accounts' : undefined}
              >
                {isNew ? 'Create Batch' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
