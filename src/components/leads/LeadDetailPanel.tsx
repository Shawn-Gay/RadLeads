import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadDetailPanelProps {
  lead: Lead
  onClose: () => void
  className?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground text-xs pt-0.5">{label}</span>
      <span className="text-foreground font-medium flex-1">{value}</span>
    </div>
  )
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground text-xs pt-0.5">{label}</span>
      <span className="text-foreground font-medium flex-1">{value}</span>
      <CopyButton text={value} />
    </div>
  )
}

interface InsightCardProps {
  title: string
  text: string
  colorClass: string
}

function InsightCard({ title, text, colorClass }: InsightCardProps) {
  return (
    <div className={cn('rounded-lg p-3 text-sm', colorClass)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-xs uppercase tracking-wide opacity-70">{title}</span>
        <CopyButton text={text} />
      </div>
      <p className="leading-relaxed text-xs opacity-90">{text}</p>
    </div>
  )
}

export function LeadDetailPanel({ lead, onClose, className }: LeadDetailPanelProps) {
  return (
    <aside
      className={cn(
        'w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{lead.company}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{lead.domain}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Contact section */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</p>
          <div className="space-y-2">
            <InfoRow label="Name" value={`${lead.firstName} ${lead.lastName}`} />
            <InfoRow label="Title" value={lead.title} />
            <CopyRow label="Email" value={lead.email} />
            {lead.phone && <CopyRow label="Phone" value={lead.phone} />}
            <InfoRow label="City" value={lead.city} />
            <InfoRow label="Team size" value={lead.employees} />
          </div>
        </div>

        {/* AI Insights section */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Insights</p>
          <div className="space-y-2">
            <InsightCard
              title="Recent News"
              text={lead.recentNews}
              colorClass="bg-muted text-foreground"
            />
            <InsightCard
              title="Pain Point"
              text={lead.painPoint}
              colorClass="bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
            />
            <InsightCard
              title="Icebreaker"
              text={lead.icebreaker}
              colorClass="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
