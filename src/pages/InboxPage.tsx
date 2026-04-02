import { useState } from 'react'
import { ChevronLeft, Sparkles, Send } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { draftReply } from '@/services/ai'
import { cn } from '@/lib/utils'
import type { InboxMessage } from '@/types'

const OUR_DOMAIN = 'radcoreai.com'

function isOurs(from: string): boolean {
  return from.includes(OUR_DOMAIN) || from.includes('radleads.io')
}

export function InboxPage() {
  const { inbox, markRead } = useAppContext()
  const [selected, setSelected] = useState<InboxMessage | null>(inbox[0] ?? null)
  const [replyText, setReplyText] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentConfirm, setSentConfirm] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')

  function handleSelect(msg: InboxMessage) {
    setSelected(msg)
    markRead(msg.id)
    setReplyText('')
    setSentConfirm(false)
    setMobileView('thread')
  }

  async function handleAiDraft() {
    if (!selected) return
    setDrafting(true)
    try {
      const lastMsg = selected.thread[selected.thread.length - 1]
      const draft = await draftReply(selected.name, lastMsg.body)
      setReplyText(draft)
    } finally {
      setDrafting(false)
    }
  }

  async function handleSend() {
    if (!replyText.trim()) return
    setSending(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setSending(false)
    setReplyText('')
    setSentConfirm(true)
    setTimeout(() => setSentConfirm(false), 2000)
  }

  const unreadCount = inbox.filter(o => !o.read).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="bg-card border-b border-border h-12 flex items-center px-5 gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Inbox</h1>
        {unreadCount > 0 && (
          <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Message list */}
        <div className={cn(
          "border-r border-border bg-card overflow-y-auto md:w-72 md:shrink-0",
          mobileView === 'thread' ? "hidden md:block" : "w-full"
        )}>
          {inbox.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No messages
            </div>
          ) : inbox.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-border hover:bg-muted transition-colors',
                selected?.id === msg.id && 'bg-blue-50 dark:bg-blue-950'
              )}
            >
              <div className="flex items-start gap-2">
                {!msg.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                )}
                <div className={cn('min-w-0', msg.read && 'pl-4')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      'text-sm truncate',
                      !msg.read ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                    )}>
                      {msg.name}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{msg.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.preview}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Thread view */}
        {selected ? (
          <div className={cn(
            "flex-1 flex flex-col overflow-hidden bg-background",
            mobileView === 'list' ? "hidden md:flex" : "flex"
          )}>
            {/* Thread header */}
            <div className="bg-card border-b border-border px-4 py-3 shrink-0">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden shrink-0 p-1 -ml-1 rounded text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground truncate">{selected.subject}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.name} · {selected.company}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selected.thread.map((msg, i) => {
                const ours = isOurs(msg.from)
                return (
                  <div
                    key={i}
                    className={cn('flex', ours ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn(
                      'max-w-[85%] md:max-w-lg rounded-lg px-4 py-3 text-sm',
                      ours
                        ? 'bg-blue-600 text-white'
                        : 'bg-card border border-border text-foreground'
                    )}>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.body}</pre>
                      <p className={cn(
                        'text-[10px] mt-2',
                        ours ? 'text-blue-200' : 'text-muted-foreground'
                      )}>{msg.time}</p>
                    </div>
                  </div>
                )
              })}
              {sentConfirm && (
                <div className="flex justify-end">
                  <p className="text-xs text-emerald-600 font-medium">Message sent!</p>
                </div>
              )}
            </div>

            {/* Reply composer */}
            <div className="bg-card border-t border-border p-4 shrink-0">
              <p className="text-[10px] text-muted-foreground mb-2">
                From: shawn@radcoreai.com
              </p>
              <textarea
                className="w-full h-24 text-sm border border-input rounded-lg px-3 py-2 resize-none bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-muted-foreground"
                placeholder="Write a reply…"
                value={replyText}
                onChange={o => setReplyText(o.target.value)}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAiDraft}
                  disabled={drafting}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {drafting ? 'Drafting…' : 'AI draft'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 ml-auto"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(
            "flex-1 items-center justify-center text-sm text-muted-foreground",
            mobileView === 'list' ? "hidden md:flex" : "flex"
          )}>
            Select a message to view the thread.
          </div>
        )}
      </div>
    </div>
  )
}
