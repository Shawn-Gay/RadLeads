import { Mail, Eye, MousePointerClick, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FollowUpEmail } from '@/types'

interface EmailHistoryCardProps {
  emails: FollowUpEmail[]
}

const STATUS_STYLES = {
  Sent:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Failed:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_ICONS = {
  Sent:    null,
  Pending: Clock,
  Failed:  AlertCircle,
}

export function EmailHistoryCard({ emails }: EmailHistoryCardProps) {
  if (emails.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Email History ({emails.length})
      </p>
      <div className="space-y-2">
        {emails.slice(0, 8).map(email => {
          const StatusIcon = STATUS_ICONS[email.status]
          return (
            <div key={email.id} className="flex items-center gap-2 text-xs">
              <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5', STATUS_STYLES[email.status])}>
                {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                {email.status}
              </span>
              <span className="text-muted-foreground text-[10px] truncate flex-1">{email.subject}</span>
              <span className="text-muted-foreground text-[10px] shrink-0">
                {new Date(email.createdAt).toLocaleDateString()}
              </span>
              {email.openCount > 0 && (
                <span className="flex items-center gap-0.5 text-blue-500 text-[10px] shrink-0">
                  <Eye className="h-2.5 w-2.5" />
                  {email.openCount}
                </span>
              )}
              {email.clickCount > 0 && (
                <span className="flex items-center gap-0.5 text-purple-500 text-[10px] shrink-0">
                  <MousePointerClick className="h-2.5 w-2.5" />
                  {email.clickCount}
                </span>
              )}
            </div>
          )
        })}
        {emails.length > 8 && (
          <p className="text-[10px] text-muted-foreground">+{emails.length - 8} more</p>
        )}
      </div>
    </div>
  )
}
