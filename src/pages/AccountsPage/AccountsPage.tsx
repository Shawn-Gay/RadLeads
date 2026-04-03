import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import type { EmailAccount, WarmupBatch } from '@/types'
import { ConnectModal } from './ConnectModal'
import { AccountCard } from './AccountCard'
import { BatchSummary } from './BatchSummary'
import { ManageBatchModal } from './ManageBatchModal'

type BatchModalState =
  | { open: false }
  | { open: true; batch: WarmupBatch | null }

export function AccountsPage() {
  const { accounts, addAccount, updateAccount, warmupActivities, warmupBatches, saveBatch, deleteBatch } = useAppContext()
  const [showConnect, setShowConnect] = useState(false)
  const [batchModal, setBatchModal] = useState<BatchModalState>({ open: false })

  function handleToggleStatus(account: EmailAccount) {
    const next = account.status === 'paused' ? 'active' : 'paused'
    updateAccount(account.id, { status: next })
  }

  // Accounts not yet assigned to any batch
  const unbatchedAccounts = accounts.filter(o => o.warmupBatchId === null)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showConnect && (
        <ConnectModal
          onClose={() => setShowConnect(false)}
          onConnected={(email, provider, dailyLimit) => addAccount(email, provider, dailyLimit)}
        />
      )}

      {batchModal.open && (
        <ManageBatchModal
          batch={batchModal.batch}
          accounts={accounts}
          onSave={saveBatch}
          onDelete={deleteBatch}
          onClose={() => setBatchModal({ open: false })}
        />
      )}

      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground mr-auto">Email Accounts</h1>
        <button
          onClick={() => setBatchModal({ open: true, batch: null })}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Users className="h-3.5 w-3.5" /> New Batch
        </button>
        <button
          onClick={() => setShowConnect(true)}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Connect Inbox
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-background">

        {/* Warmup batch sections */}
        {warmupBatches.map(batch => {
          const batchAccounts = accounts.filter(o => o.warmupBatchId === batch.id)
          if (batchAccounts.length === 0) return null
          return (
            <section key={batch.id}>
              <BatchSummary
                batch={batch}
                accounts={batchAccounts}
                onEdit={() => setBatchModal({ open: true, batch })}
              />
              <div className="mt-3 space-y-3">
                {batchAccounts.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    activities={warmupActivities.filter(o => o.accountId === account.id)}
                    onToggle={() => handleToggleStatus(account)}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Unbatched accounts */}
        {unbatchedAccounts.length > 0 && (
          <section className="space-y-3">
            {warmupBatches.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Other Accounts</p>
            )}
            {unbatchedAccounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                activities={warmupActivities.filter(o => o.accountId === account.id)}
                onToggle={() => handleToggleStatus(account)}
              />
            ))}
          </section>
        )}

        {/* Empty state */}
        {accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No inboxes connected yet.</p>
            <button
              onClick={() => setShowConnect(true)}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Connect your first inbox →
            </button>
          </div>
        )}

        {/* Tip card */}
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Cost-saving setup tip</h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
            For the most affordable cold email infrastructure, register domains on{' '}
            <strong>Namecheap</strong> (~$10/yr), configure DNS via{' '}
            <strong>Cloudflare</strong> (free), and send via{' '}
            <strong>Resend</strong> ($20/mo for 50k emails). This setup keeps deliverability
            high while staying well under budget.
          </p>
        </div>
      </div>
    </div>
  )
}
