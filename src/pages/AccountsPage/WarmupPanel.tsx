import { Send, ShieldCheck, BookOpen, Star, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailAccount, WarmupActivity, WarmupActionType } from '@/types'

export const ACTION_META: Record<WarmupActionType, { icon: React.ReactNode; label: string; color: string }> = {
  sent:            { icon: <Send className="h-3 w-3" />,           label: 'Sent',        color: 'text-blue-500' },
  marked_not_spam: { icon: <ShieldCheck className="h-3 w-3" />,    label: 'Not Spam',    color: 'text-emerald-500' },
  marked_read:     { icon: <BookOpen className="h-3 w-3" />,       label: 'Marked Read', color: 'text-slate-500' },
  starred:         { icon: <Star className="h-3 w-3" />,           label: 'Starred',     color: 'text-amber-500' },
  replied:         { icon: <MessageSquare className="h-3 w-3" />,  label: 'Replied',     color: 'text-violet-500' },
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface WarmupPanelProps {
  account: EmailAccount
  activities: WarmupActivity[]
}

export function WarmupPanel({ account: a, activities }: WarmupPanelProps) {
  const pct = Math.round(((a.warmupDay ?? 0) / a.warmupTotalDays) * 100)
  const recent = [...activities]
    .sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())
    .slice(0, 5)

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Warmup progress</span>
          <span className="text-xs font-semibold text-foreground">
            Day {a.warmupDay} / {a.warmupTotalDays}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-amber-400 transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {a.warmupTotalDays - (a.warmupDay ?? 0)} days remaining until graduation
        </p>
      </div>

      {recent.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Recent activity</p>
          <ul className="space-y-1">
            {recent.map(act => {
              const meta = ACTION_META[act.action]
              return (
                <li key={act.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn('shrink-0', meta.color)}>{meta.icon}</span>
                  <span className="truncate">{meta.label} · {act.partnerEmail}</span>
                  <span className="ml-auto shrink-0 text-[10px]">{formatRelativeTime(act.timestamp)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {recent.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No warmup activity recorded yet.</p>
      )}
    </div>
  )
}
