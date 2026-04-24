import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, CheckCircle2, Flame, PhoneCall, Snowflake, Ban, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CADENCE_TOTAL_TOUCHES } from '@/lib/dialerQueue'
import { useDialerContext } from '@/context/DialerContext'
import type { Company, CallLog, DialDisposition } from '@/types'

const DISPOSITION_LABEL: Record<Exclude<DialDisposition, 'None'>, string> = {
  NotInterested: 'Not interested',
  BadNumber:     'Bad number',
  Converted:     'Converted',
}

function timeAgo(iso: string, now: number): string {
  const diffMs = now - Date.parse(iso)
  const d = Math.floor(diffMs / 86_400_000)
  if (d >= 1) return `${d}d ago`
  const h = Math.floor(diffMs / 3_600_000)
  if (h >= 1) return `${h}h ago`
  return 'just now'
}

function formatCallbackTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDue(iso: string, now: number): string {
  const diff = Math.round((Date.parse(iso) - now) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 6) return `in ${diff}d`
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface SectionProps {
  label:     string
  icon:      React.ReactNode
  companies: Company[]
  displayNumberFor: (id: string) => number
  activeId:  string | null
  onJumpById: (id: string) => void
  renderMeta: (c: Company, logs: CallLog[]) => React.ReactNode
  callLogsByCompany: Map<string, CallLog[]>
}

function Section({ label, icon, companies, displayNumberFor, activeId, onJumpById, renderMeta, callLogsByCompany }: SectionProps) {
  if (companies.length === 0) return null
  return (
    <div>
      <div className="sticky top-0 z-10 px-3 py-1.5 bg-muted/50 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
        <span className="ml-auto tabular-nums">{companies.length}</span>
      </div>
      {companies.map(company => {
        const num = displayNumberFor(company.id)
        const active = company.id === activeId
        const logs = callLogsByCompany.get(company.id) ?? []
        return (
          <button
            key={company.id}
            data-queue-id={company.id}
            onClick={() => onJumpById(company.id)}
            className={cn(
              'w-full text-left px-3 py-2 border-b border-border transition-colors border-l-2',
              active
                ? 'bg-blue-50 dark:bg-blue-950 border-l-blue-600'
                : 'hover:bg-muted border-l-transparent',
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-5 shrink-0">
                {num + 1}
              </span>
              <span className={cn(
                'text-xs font-medium truncate flex-1',
                active ? 'text-blue-700 dark:text-blue-300' : 'text-foreground',
              )}>
                {company.name || company.domain}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 ml-7 text-[10px] text-muted-foreground">
              {renderMeta(company, logs)}
            </div>
          </button>
        )
      })}
    </div>
  )
}

interface DisplaySectionProps {
  label:    string
  icon:     React.ReactNode
  companies: Company[]
  renderMeta: (c: Company) => React.ReactNode
  sort?: (a: Company, b: Company) => number
  activeId?: string | null
  onJumpById?: (id: string) => void
}

function DisplaySection({ label, icon, companies, renderMeta, sort, activeId, onJumpById }: DisplaySectionProps) {
  if (companies.length === 0) return null
  const sorted = sort ? [...companies].sort(sort) : companies
  return (
    <div>
      <div className="sticky top-0 z-10 px-3 py-1.5 bg-muted/50 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
        <span className="ml-auto tabular-nums">{companies.length}</span>
      </div>
      {sorted.map(company => {
        const active = !!onJumpById && company.id === activeId
        const inner = (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-5 shrink-0">—</span>
              <span className={cn('text-xs font-medium truncate flex-1', active ? 'text-blue-700 dark:text-blue-300' : 'text-foreground')}>
                {company.name || company.domain}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 ml-7 text-[10px] text-muted-foreground">
              {renderMeta(company)}
            </div>
          </>
        )
        if (onJumpById) {
          return (
            <button
              key={company.id}
              data-queue-id={company.id}
              onClick={() => onJumpById(company.id)}
              className={cn(
                'w-full text-left px-3 py-2 border-b border-border transition-colors border-l-2',
                active ? 'bg-blue-50 dark:bg-blue-950 border-l-blue-600' : 'hover:bg-muted border-l-transparent',
              )}
            >
              {inner}
            </button>
          )
        }
        return (
          <div
            key={company.id}
            className="w-full text-left px-3 py-2 border-b border-border border-l-2 border-l-transparent opacity-55"
          >
            {inner}
          </div>
        )
      })}
    </div>
  )
}

interface QueueSidebarProps {
  open: boolean
  onClose: () => void
}

export function QueueSidebar({ open, onClose }: QueueSidebarProps) {
  const { dialerQueue, dialerBuckets, allBuckets, dialerCompany, dialerJumpTo, dialerJumpToById, callLogsByCompany, assignedCompanies } = useDialerContext()
  const listRef = useRef<HTMLDivElement>(null)
  const [showAll, setShowAll] = useState(false)
  const now = Date.now()

  const activeId = dialerCompany?.id ?? null

  useEffect(() => {
    if (!activeId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-queue-id="${activeId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  // Numbering reflects position in the currently-visible due list, not the full session queue.
  const visibleFlat = useMemo(() => {
    const b = showAll ? allBuckets : dialerBuckets
    return [...b.callbacks, ...b.dueToday, ...b.fresh]
  }, [showAll, allBuckets, dialerBuckets])

  const displayNumberById = useMemo(() => {
    const m = new Map<string, number>()
    visibleFlat.forEach((c, i) => m.set(c.id, i))
    return m
  }, [visibleFlat])
  const displayNumberFor = (id: string) => displayNumberById.get(id) ?? -1

  const jumpIndexById = useMemo(() => {
    const m = new Map<string, number>()
    dialerQueue.forEach((c, i) => m.set(c.id, i))
    return m
  }, [dialerQueue])
  const onJumpById = (id: string) => {
    const i = jumpIndexById.get(id)
    if (i !== undefined) dialerJumpTo(i)
  }

  // Leads assigned to this dialer but not in any cadence-driven bucket (Completed, Dropped,
  // or non-None disposition). Shown only in "All" mode.
  const completed = useMemo(
    () => assignedCompanies.filter(o => o.cadenceStatus === 'Completed' && o.dialDisposition === 'None'),
    [assignedCompanies],
  )
  const dispositioned = useMemo(
    () => assignedCompanies.filter(o => o.dialDisposition !== 'None' || o.cadenceStatus === 'Dropped'),
    [assignedCompanies],
  )

  const todayCount = dialerBuckets.callbacks.length + dialerBuckets.dueToday.length + dialerBuckets.fresh.length
  const totalCount = assignedCompanies.length

  return (
    <aside className={cn(
      'border-r border-border bg-card flex flex-col',
      'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-200',
      open ? 'translate-x-0' : '-translate-x-full',
      'md:relative md:inset-auto md:z-auto md:w-64 md:shrink-0 md:translate-x-0',
    )}>
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground shrink-0">Queue</span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground md:hidden"
          aria-label="Close queue"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-semibold shrink-0">
          <button
            onClick={() => setShowAll(false)}
            className={cn(
              'px-2 py-0.5 transition-colors',
              !showAll
                ? 'bg-blue-600 text-white'
                : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            Today <span className="tabular-nums">{todayCount}</span>
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={cn(
              'px-2 py-0.5 transition-colors border-l border-border',
              showAll
                ? 'bg-blue-600 text-white'
                : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            All <span className="tabular-nums">{totalCount}</span>
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {todayCount === 0 && !showAll ? (
          <p className="p-4 text-xs text-muted-foreground">Queue clear — go home.</p>
        ) : showAll && totalCount === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">No leads assigned.</p>
        ) : (
          <>
            <Section
              label="Callbacks"
              icon={<PhoneCall className="h-3 w-3 text-amber-500" />}
              companies={showAll ? allBuckets.callbacks : dialerBuckets.callbacks}
              displayNumberFor={displayNumberFor}
              activeId={activeId}
              onJumpById={onJumpById}
              callLogsByCompany={callLogsByCompany}
              renderMeta={(c) => (
                <>
                  <Flame className="h-2.5 w-2.5 text-orange-500" />
                  <span className="truncate">
                    {c.nextTouchAt ? formatCallbackTime(c.nextTouchAt) : 'now'}
                  </span>
                  <span className="truncate">· Touch {c.currentTouchNumber || 1}</span>
                </>
              )}
            />
            <Section
              label="Due Today"
              icon={<Flame className="h-3 w-3 text-rose-500" />}
              companies={showAll ? allBuckets.dueToday : dialerBuckets.dueToday}
              displayNumberFor={displayNumberFor}
              activeId={activeId}
              onJumpById={onJumpById}
              callLogsByCompany={callLogsByCompany}
              renderMeta={(c, logs) => (
                <>
                  <span>Touch {c.currentTouchNumber}/{CADENCE_TOTAL_TOUCHES}</span>
                  {logs[0] && (
                    <span className="truncate">· {logs[0].outcome} {timeAgo(logs[0].calledAt, now)}</span>
                  )}
                </>
              )}
            />
            <Section
              label="Fresh"
              icon={<Snowflake className="h-3 w-3 text-sky-500" />}
              companies={showAll ? allBuckets.fresh : dialerBuckets.fresh}
              displayNumberFor={displayNumberFor}
              activeId={activeId}
              onJumpById={onJumpById}
              callLogsByCompany={callLogsByCompany}
              renderMeta={() => (
                <span className="flex items-center gap-1">
                  <Snowflake className="h-2.5 w-2.5 text-sky-500" />
                  Never called
                </span>
              )}
            />
            {showAll && (
              <>
                <DisplaySection
                  label="Scheduled"
                  icon={<CalendarClock className="h-3 w-3 text-slate-400" />}
                  companies={allBuckets.scheduled}
                  activeId={activeId}
                  onJumpById={dialerJumpToById}
                  sort={(a, b) => {
                    const aAt = a.nextTouchAt ? Date.parse(a.nextTouchAt) : Infinity
                    const bAt = b.nextTouchAt ? Date.parse(b.nextTouchAt) : Infinity
                    return aAt - bAt
                  }}
                  renderMeta={(c) => (
                    <>
                      <span>Touch {c.currentTouchNumber}/{CADENCE_TOTAL_TOUCHES}</span>
                      {c.nextTouchAt && (
                        <span>· Due {formatDue(c.nextTouchAt, now)}</span>
                      )}
                    </>
                  )}
                />
                <DisplaySection
                  label="Completed"
                  icon={<CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  companies={completed}
                  renderMeta={(c) => (
                    <span>Touch {c.currentTouchNumber}/{CADENCE_TOTAL_TOUCHES}</span>
                  )}
                />
                <DisplaySection
                  label="Closed"
                  icon={<Ban className="h-3 w-3 text-muted-foreground" />}
                  companies={dispositioned}
                  renderMeta={(c) => (
                    <span className="truncate">
                      {c.dialDisposition !== 'None'
                        ? DISPOSITION_LABEL[c.dialDisposition]
                        : 'Dropped'}
                    </span>
                  )}
                />
              </>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
