import { useState } from 'react'
import { X, CheckCircle2, Loader2, Mail, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountProvider } from '@/types'
import { PROVIDERS, PROVIDER_DEFAULTS } from './providerConfig'

type ModalStep = 'select' | 'credentials' | 'testing' | 'success'

interface ConnectModalProps {
  onClose: () => void
  onConnected: (email: string, provider: AccountProvider, dailyLimit: number) => void
}

export function ConnectModal({ onClose, onConnected }: ConnectModalProps) {
  const [step, setStep] = useState<ModalStep>('select')
  const [provider, setProvider] = useState<AccountProvider | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('465')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [dailyLimit, setDailyLimit] = useState('40')

  function selectProvider(p: AccountProvider) {
    setProvider(p)
    const d = PROVIDER_DEFAULTS[p]
    setSmtpHost(d.smtpHost)
    setSmtpPort(d.smtpPort)
    setImapHost(d.imapHost)
    setImapPort(d.imapPort)
    setStep('credentials')
  }

  async function handleTestConnection() {
    if (!email.trim() || !password.trim()) return
    setStep('testing')
    await new Promise(r => setTimeout(r, 2200))
    setStep('success')
  }

  function handleDone() {
    onConnected(email.trim(), provider!, Number(dailyLimit) || 40)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-foreground">
            {step === 'select'      && 'Connect an inbox'}
            {step === 'credentials' && PROVIDERS.find(o => o.id === provider)?.label}
            {step === 'testing'     && 'Testing connection…'}
            {step === 'success'     && 'Inbox connected!'}
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex-1">
          {step === 'select' && (
            <div className="space-y-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  disabled={p.soon}
                  onClick={() => selectProvider(p.id)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 border rounded-lg px-4 py-3 transition-colors',
                    p.soon
                      ? 'border-border opacity-50 cursor-not-allowed'
                      : 'border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer'
                  )}
                >
                  <div className="mt-0.5">
                    {p.id === 'google'
                      ? <Globe className="h-4 w-4 text-muted-foreground" />
                      : <Mail className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      {p.soon && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'credentials' && provider !== 'google' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email address</label>
                <input
                  type="email" autoFocus
                  className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="you@yourdomain.com"
                  value={email}
                  onChange={o => setEmail(o.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Password</label>
                <input
                  type="password"
                  className="w-full text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={o => setPassword(o.target.value)}
                />
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">SMTP (outgoing)</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 text-xs border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="smtp.host.com"
                    value={smtpHost}
                    onChange={o => setSmtpHost(o.target.value)}
                  />
                  <input
                    className="w-16 text-xs border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Port"
                    value={smtpPort}
                    onChange={o => setSmtpPort(o.target.value)}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">IMAP (incoming)</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 text-xs border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="imap.host.com"
                    value={imapHost}
                    onChange={o => setImapHost(o.target.value)}
                  />
                  <input
                    className="w-16 text-xs border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Port"
                    value={imapPort}
                    onChange={o => setImapPort(o.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Daily send limit</label>
                <input
                  type="number" min={1} max={200}
                  className="w-28 text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={dailyLimit}
                  onChange={o => setDailyLimit(o.target.value)}
                />
              </div>
            </div>
          )}

          {step === 'testing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Verifying SMTP and IMAP…</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">Connection verified</p>
              <p className="text-xs text-muted-foreground">{email} is ready. Warmup will begin automatically.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          {step === 'credentials' ? (
            <>
              <button onClick={() => setStep('select')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
              <button
                onClick={handleTestConnection}
                disabled={!email.trim() || !password.trim()}
                className="text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors"
              >
                Test &amp; Connect
              </button>
            </>
          ) : step === 'success' ? (
            <>
              <span />
              <button onClick={handleDone} className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md transition-colors">
                Done
              </button>
            </>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}
