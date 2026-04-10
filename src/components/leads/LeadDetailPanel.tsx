import { X, Copy, Check, ExternalLink, Sparkles, MapPin, Mail } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Company, LeadPerson, LeadEmail, Campaign, EmailSource, EmailStatus } from '@/types'

interface PersonDetailPanelProps {
  company: Company
  person: LeadPerson
  campaigns: Campaign[]
  onClose: () => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">{title}</p>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground text-xs pt-0.5">{label}</span>
      <span className="text-foreground font-medium flex-1 text-xs">{value}</span>
    </div>
  )
}

const SOURCE_STYLES: Record<EmailSource, string> = {
  csv:     'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  guessed: 'bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
  scraped: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  api:     'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
}
const SOURCE_LABELS: Record<EmailSource, string> = {
  csv: 'CSV', guessed: 'Guessed', scraped: 'Scraped', api: 'API',
}

const STATUS_STYLES: Record<EmailStatus, string> = {
  verified: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  bounced:  'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  unknown:  'bg-muted text-muted-foreground',
}
const STATUS_ICONS: Record<EmailStatus, string> = {
  verified: '✓', bounced: '✗', unknown: '?',
}

function EmailRow({ email }: { email: LeadEmail }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs',
      email.isPrimary ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50' : 'border-border bg-muted/30'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {email.isPrimary && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Primary</span>
          )}
          <span className="font-medium text-foreground truncate">{email.address}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn('inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full', SOURCE_STYLES[email.source])}>
            {SOURCE_LABELS[email.source]}
          </span>
          <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full', STATUS_STYLES[email.status])}>
            {STATUS_ICONS[email.status]} {email.status}
          </span>
        </div>
      </div>
      <CopyButton text={email.address} />
    </div>
  )
}

function InsightCard({ title, text, colorClass }: { title: string; text: string; colorClass: string }) {
  return (
    <div className={cn('rounded-lg p-3 text-sm', colorClass)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-[10px] uppercase tracking-wide opacity-70">{title}</span>
        <CopyButton text={text} />
      </div>
      <p className="leading-relaxed text-xs opacity-90">{text}</p>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function PersonDetailPanel({ company, person, campaigns, onClose }: PersonDetailPanelProps) {
  const personCampaigns = campaigns.filter(c => person.campaignIds.includes(c.id))
  const initials = `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`.toUpperCase()

  const isEnriched   = company.enrichStatus === 'enriched'
  const isResearched = company.enrichStatus === 'researched' || company.enrichStatus === 'enriching' || isEnriched

  return (
    <aside className={cn(
      'fixed inset-0 z-50 flex flex-col bg-card overflow-hidden',
      'md:absolute md:right-0 md:top-0 md:bottom-0 md:z-10 md:w-80 md:border-l md:border-border md:shadow-xl'
    )}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">
                {person.firstName} {person.lastName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{person.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Contact */}
        <Section title="Contact">
          <div className="space-y-1.5">
            {person.sourcePage && (
              <div className="flex items-start gap-2 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground text-xs pt-0.5">Found on</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <MapPin className="h-3 w-3" />
                  {person.sourcePage} page
                </span>
              </div>
            )}
            {person.city && <InfoRow label="City" value={person.city} />}
            {person.phone && (
              <div className="flex items-start gap-2">
                <span className="w-20 shrink-0 text-muted-foreground text-xs pt-0.5">Phone</span>
                <span className="text-foreground font-medium flex-1 text-xs">{person.phone}</span>
                <CopyButton text={person.phone} />
              </div>
            )}
            {person.linkedinUrl && (
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-muted-foreground text-xs">LinkedIn</span>
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Profile <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </Section>

        {/* Emails */}
        <Section title={`Emails (${person.emails.length})`}>
          {person.emails.length > 0 ? (
            <div className="space-y-1.5">
              {person.emails.map(email => (
                <EmailRow key={email.address} email={email} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isResearched
                ? 'No emails found yet. Run Enrich to generate combinations.'
                : 'No emails found in CSV.'}
            </p>
          )}
        </Section>

        {/* Generic company emails — fallback contacts */}
        {company.genericEmails && company.genericEmails.length > 0 && (
          <Section title={<><Mail className="h-3 w-3" /> Company Emails</>}>
            <div className="space-y-1">
              {company.genericEmails.map(email => (
                <div key={email} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-muted/30 text-xs">
                  <span className="flex-1 text-foreground truncate">{email}</span>
                  <CopyButton text={email} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Content tokens — only after enrich */}
        {isEnriched && (person.icebreaker || person.painPoint) && (
          <Section title={<><Sparkles className="h-3 w-3" /> Content Tokens</>}>
            <div className="space-y-2">
              {person.icebreaker && (
                <InsightCard
                  title="{{ice_breaker}}"
                  text={person.icebreaker}
                  colorClass="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                />
              )}
              {person.painPoint && (
                <InsightCard
                  title="{{pain_point}}"
                  text={person.painPoint}
                  colorClass="bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                />
              )}
            </div>
          </Section>
        )}

        {/* Campaigns */}
        {personCampaigns.length > 0 && (
          <Section title="In Campaigns">
            <div className="space-y-1">
              {personCampaigns.map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                  <span className="text-xs text-foreground">{c.name}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </aside>
  )
}
