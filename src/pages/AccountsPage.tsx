import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { EmailAccount } from '@/types'

export function AccountsPage() {
  const { accounts, updateAccount } = useAppContext()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newLimit, setNewLimit] = useState('40')

  function handleToggleStatus(account: EmailAccount) {
    const next = account.status === 'paused' ? 'active' : 'paused'
    updateAccount(account.id, { status: next })
  }

  function handleAddAccount() {
    if (!newEmail.trim()) return
    setNewEmail('')
    setNewLimit('40')
    setShowAddForm(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground mr-auto">Email Accounts</h1>
        <button
          onClick={() => setShowAddForm(o => !o)}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Account
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
        {/* Add account form */}
        {showAddForm && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Add Email Account</h3>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email address</label>
                <input
                  type="email"
                  className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="sender@yourdomain.com"
                  value={newEmail}
                  onChange={o => setNewEmail(o.target.value)}
                />
              </div>
              <div className="w-full sm:w-28">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Daily limit</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={newLimit}
                  onChange={o => setNewLimit(o.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddAccount}
                  className="flex-1 sm:flex-none text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 sm:flex-none text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account cards */}
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} onToggle={() => handleToggleStatus(account)} />
        ))}

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

function AccountCard({ account: a, onToggle }: { account: EmailAccount; onToggle: () => void }) {
  const pct = Math.round((a.sentToday / a.dailyLimit) * 100)

  return (
    <div className="bg-card border border-border rounded-lg px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <span className={cn(
          'w-2.5 h-2.5 rounded-full mt-1 shrink-0',
          a.status === 'active' ? 'bg-emerald-500' :
          a.status === 'warming' ? 'bg-amber-400' : 'bg-muted-foreground'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-foreground">{a.email}</p>
            <StatusBadge status={a.status} />
            {a.warmupDay !== null && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full">
                Warmup day {a.warmupDay}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
            {a.health !== null && (
              <span>
                Health: <span className={cn(
                  'font-semibold',
                  a.health >= 80 ? 'text-emerald-600' : a.health >= 60 ? 'text-amber-600' : 'text-red-500'
                )}>{a.health}%</span>
              </span>
            )}
            <span>Sent today: <span className="font-semibold text-foreground">{a.sentToday}</span> / {a.dailyLimit}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'shrink-0 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
            a.status === 'paused'
              ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900'
              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {a.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  )
}
