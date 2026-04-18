import { useEffect, useMemo, useState } from 'react'
import { Mail, Plus, Save, Archive, ArchiveRestore, Trash2, Loader2, X, Star, StarOff } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { EMAIL_TOKEN_HINTS } from '@/lib/tokens'
import { CALL_OUTCOME_LABELS, CALL_OUTCOME_STYLES } from '@/pages/LeadsPage/constants'
import type { CallOutcome } from '@/types'
import { cn } from '@/lib/utils'

const ALL_OUTCOMES: CallOutcome[] = [
  'Connected', 'Interested', 'CallBack', 'LeftVoicemail',
  'LeftMessage', 'NoAnswer', 'NotInterested', 'WrongNumber',
]

export function EmailTemplatesPage() {
  const {
    emailTemplates,
    addEmailTemplate, editEmailTemplate, archiveEmailTemplate, removeEmailTemplate,
    assignEmailTemplateToOutcome, unassignEmailTemplateFromOutcome,
  } = useAppContext()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const visibleTemplates = useMemo(
    () => emailTemplates.filter(o => showArchived ? true : !o.isArchived),
    [emailTemplates, showArchived],
  )

  const selected = emailTemplates.find(o => o.id === selectedId) ?? null

  useEffect(() => {
    if (isNew) {
      setName(''); setSubject(''); setBody('')
      return
    }
    if (selected) {
      setName(selected.name)
      setSubject(selected.subject)
      setBody(selected.body)
    }
  }, [selectedId, isNew, selected])

  const dirty = selected
    ? (selected.name !== name || selected.subject !== subject || selected.body !== body)
    : (isNew && (name.trim().length > 0 || subject.length > 0 || body.length > 0))

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const t = await addEmailTemplate(name.trim(), subject, body)
        setIsNew(false)
        setSelectedId(t.id)
      } else if (selected) {
        await editEmailTemplate(selected.id, name.trim(), subject, body)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!selected) return
    await archiveEmailTemplate(selected.id, !selected.isArchived)
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Delete template "${selected.name}"? This cannot be undone.`)) return
    const id = selected.id
    setSelectedId(null)
    await removeEmailTemplate(id)
  }

  function startNew() {
    setIsNew(true)
    setSelectedId(null)
  }

  function cancelNew() {
    setIsNew(false)
  }

  function insertToken(token: string) {
    setBody(body + ' ' + token)
  }

  async function toggleOutcome(outcome: CallOutcome) {
    if (!selected) return
    const existing = selected.outcomeAssignments.find(o => o.outcome === outcome)
    if (existing) {
      await unassignEmailTemplateFromOutcome(selected.id, outcome)
    } else {
      await assignEmailTemplateToOutcome(selected.id, outcome, false)
    }
  }

  async function toggleDefault(outcome: CallOutcome) {
    if (!selected) return
    const existing = selected.outcomeAssignments.find(o => o.outcome === outcome)
    if (!existing) return
    await assignEmailTemplateToOutcome(selected.id, outcome, !existing.isDefault)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-card border-b border-border h-12 flex items-center px-5 shrink-0 gap-2">
        <Mail className="h-4 w-4 text-blue-600" />
        <h1 className="text-sm font-semibold text-foreground">Email Templates</h1>
        <span className="text-xs text-muted-foreground">· {visibleTemplates.length}</span>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* List */}
        <aside className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <button
              onClick={startNew}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Template
            </button>
          </div>
          <label className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground cursor-pointer border-b border-border">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="rounded border-border"
            />
            Show archived
          </label>
          <div className="flex-1 overflow-y-auto">
            {visibleTemplates.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">No templates yet.</p>
            ) : (
              visibleTemplates.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setIsNew(false); setSelectedId(o.id) }}
                  className={
                    'w-full text-left px-3 py-2 text-xs border-b border-border transition-colors ' +
                    (selectedId === o.id && !isNew
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'text-foreground hover:bg-muted')
                  }
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{o.name}</span>
                    {o.isArchived && <Archive className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {o.subject || '—'}
                  </div>
                  {o.outcomeAssignments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {o.outcomeAssignments.map(a => (
                        <span
                          key={a.id}
                          className={cn(
                            'inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                            CALL_OUTCOME_STYLES[a.outcome],
                          )}
                        >
                          {a.isDefault && <Star className="h-2 w-2 fill-current" />}
                          {CALL_OUTCOME_LABELS[a.outcome]}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          {!selected && !isNew ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Select a template or create a new one.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Left voicemail follow-up"
                  className="w-full text-sm rounded-md border border-border bg-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Quick follow-up — {{company}}"
                  className="w-full text-sm rounded-md border border-border bg-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Body</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {EMAIL_TOKEN_HINTS.map(token => (
                    <button
                      key={token}
                      onClick={() => insertToken(token)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                    >
                      {token}
                    </button>
                  ))}
                </div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={14}
                  placeholder="Hi {{firstName}}, I just tried reaching you..."
                  className="w-full text-sm font-mono rounded-md border border-border bg-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!dirty || !name.trim() || saving}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {isNew ? 'Create' : 'Save'}
                </button>
                {isNew ? (
                  <button
                    onClick={cancelNew}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                ) : selected && (
                  <>
                    <button
                      onClick={handleArchive}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {selected.isArchived
                        ? <><ArchiveRestore className="h-3.5 w-3.5" /> Unarchive</>
                        : <><Archive className="h-3.5 w-3.5" /> Archive</>}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* Outcome assignment */}
              {selected && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <div>
                    <label className="text-xs font-medium text-foreground">Assigned Call Outcomes</label>
                    <p className="text-[11px] text-muted-foreground">
                      Pick which outcomes this template should appear for. Click the star to mark it as the default for that outcome — it'll auto-load in the dialer.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_OUTCOMES.map(outcome => {
                      const assignment = selected.outcomeAssignments.find(o => o.outcome === outcome)
                      const assigned = !!assignment
                      return (
                        <div
                          key={outcome}
                          className={cn(
                            'flex items-center gap-1 rounded-full border transition-colors',
                            assigned
                              ? CALL_OUTCOME_STYLES[outcome] + ' border-current/30'
                              : 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          <button
                            onClick={() => toggleOutcome(outcome)}
                            className="px-3 py-1 text-xs font-semibold rounded-l-full hover:opacity-80 transition-opacity"
                          >
                            {CALL_OUTCOME_LABELS[outcome]}
                          </button>
                          {assigned && (
                            <button
                              onClick={() => toggleDefault(outcome)}
                              title={assignment.isDefault ? 'Unset as default' : 'Set as default for this outcome'}
                              className="pr-2 pl-0.5 py-1 rounded-r-full hover:opacity-80 transition-opacity"
                            >
                              {assignment.isDefault
                                ? <Star className="h-3 w-3 fill-current" />
                                : <StarOff className="h-3 w-3 opacity-50" />}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
