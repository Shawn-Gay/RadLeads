import { useState } from 'react'
import { PhoneCall, Pencil, User } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { useAppContext } from '@/context/AppContext'
import { CALL_OUTCOME_STYLES, CALL_OUTCOME_LABELS } from '@/pages/LeadsPage/constants'
import { updateCallLogNotes } from '@/services/callLogs'
import type { CallLog } from '@/types'

interface CallHistoryCardProps {
  callLogs: CallLog[]
  onRefresh?: () => void
}

export function CallHistoryCard({ callLogs, onRefresh }: CallHistoryCardProps) {
  const { dialers } = useAppContext()
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [localNotes, setLocalNotes] = useState<Map<string, string | null>>(new Map())

  if (callLogs.length === 0) return null

  const nameById = new Map(dialers.map(o => [o.id, o.name]))

  function startEdit(log: CallLog) {
    setEditingId(log.id)
    setEditValue(log.notes ?? '')
  }

  async function handleSave() {
    if (!editingId) return
    setSaving(true)
    try {
      const trimmed = editValue.trim() || null
      await updateCallLogNotes(editingId, trimmed)
      setLocalNotes(prev => new Map(prev).set(editingId, trimmed))
      setEditingId(null)
      onRefresh?.()
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Call History ({callLogs.length})
      </p>
      <div className="space-y-3">
        {callLogs.slice(0, 8).map(log => {
          const dialerName = log.dialerId ? nameById.get(log.dialerId) : undefined
          const notes = localNotes.has(log.id) ? localNotes.get(log.id) : log.notes
          const isEditing = editingId === log.id
          return (
            <div key={log.id} className="group space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <PhoneCall className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CALL_OUTCOME_STYLES[log.outcome])}>
                  {CALL_OUTCOME_LABELS[log.outcome]}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">{formatPhone(log.calledPhone)}</span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(log.calledAt).toLocaleDateString()}
                </span>
                {dialerName && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                    <User className="h-2.5 w-2.5" />
                    {dialerName}
                  </span>
                )}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(log)}
                    title="Edit notes"
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="ml-5 space-y-1.5">
                  <textarea
                    value={editValue}
                    onChange={o => setEditValue(o.target.value)}
                    rows={2}
                    autoFocus
                    className="w-full text-xs bg-muted border border-border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground"
                    placeholder="Add notes…"
                    onKeyDown={o => { if (o.key === 'Escape') handleCancel() }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-[10px] px-2 py-0.5 rounded hover:bg-muted text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : notes ? (
                <div className="ml-5 border-l-2 border-border pl-2.5 py-0.5">
                  <p className="text-xs text-foreground/80 leading-snug whitespace-pre-wrap">{notes}</p>
                </div>
              ) : null}
            </div>
          )
        })}
        {callLogs.length > 8 && (
          <p className="text-[10px] text-muted-foreground">+{callLogs.length - 8} more</p>
        )}
      </div>
    </div>
  )
}
