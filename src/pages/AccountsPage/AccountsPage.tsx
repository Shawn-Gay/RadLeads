import { useState } from 'react'
import { Plus, Zap } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { runWarmup } from '@/services/accounts'
import { ConnectModal } from './ConnectModal'
import { AccountCard } from './AccountCard'

export function AccountsPage() {
  const { accounts, addAccount, toggleAccountStatus, warmupActivities } = useAppContext()
  const [showConnect, setShowConnect] = useState(false)
  const [warming, setWarming] = useState<'idle' | 'running' | 'done' | 'error'>('idle')

  const warmingAccounts = accounts.filter(o => o.status === 'warming' || o.status === 'active')

  async function handleRunWarmup() {
    setWarming('running')
    try {
      await runWarmup()
      setWarming('done')
      setTimeout(() => setWarming('idle'), 3000)
    } catch {
      setWarming('error')
      setTimeout(() => setWarming('idle'), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showConnect && (
        <ConnectModal
          onClose={() => setShowConnect(false)}
          onConnected={account => addAccount(account)}
        />
      )}

      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground mr-auto">Email Accounts</h1>
        {warmingAccounts.length >= 2 && (
          <button
            onClick={handleRunWarmup}
            disabled={warming === 'running'}
            className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50
              data-[state=done]:text-green-600 data-[state=error]:text-red-600
              text-muted-foreground hover:text-foreground hover:bg-muted"
            data-state={warming}
          >
            <Zap className="h-3.5 w-3.5" />
            {warming === 'running' ? 'Running…' : warming === 'done' ? 'Warmup sent' : warming === 'error' ? 'Failed' : 'Run Warmup'}
          </button>
        )}
        <button
          onClick={() => setShowConnect(true)}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Connect Inbox
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-background">
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            activities={warmupActivities.filter(o => o.accountId === account.id)}
            onToggle={() => toggleAccountStatus(account)}
          />
        ))}

        {accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No inboxes connected yet.</p>
            <button
              onClick={() => setShowConnect(true)}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Connect your first inbox
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
