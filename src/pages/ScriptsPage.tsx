import { useEffect, useMemo, useState } from 'react'
import { ScrollText, Plus, Save, Archive, ArchiveRestore, Trash2, BarChart3, Loader2, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAppContext } from '@/context/AppContext'

export function ScriptsPage() {
  const { scripts, addScript, editScript, archiveScript, removeScript } = useAppContext()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const visibleScripts = useMemo(
    () => scripts.filter(o => showArchived ? true : !o.isArchived),
    [scripts, showArchived],
  )

  const selected = scripts.find(o => o.id === selectedId) ?? null

  useEffect(() => {
    if (isNew) {
      setName('')
      setBody('')
      return
    }
    if (selected) {
      setName(selected.name)
      setBody(selected.body)
    }
  }, [selectedId, isNew, selected])

  const dirty = selected
    ? (selected.name !== name || selected.body !== body)
    : (isNew && (name.trim().length > 0 || body.length > 0))

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (isNew) {
        const s = await addScript(name.trim(), body)
        setIsNew(false)
        setSelectedId(s.id)
      } else if (selected) {
        await editScript(selected.id, name.trim(), body)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!selected) return
    await archiveScript(selected.id, !selected.isArchived)
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Delete script "${selected.name}"? This cannot be undone.`)) return
    const id = selected.id
    setSelectedId(null)
    await removeScript(id)
  }

  function startNew() {
    setIsNew(true)
    setSelectedId(null)
  }

  function cancelNew() {
    setIsNew(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-card border-b border-border h-12 flex items-center px-5 shrink-0 gap-2">
        <ScrollText className="h-4 w-4 text-blue-600" />
        <h1 className="text-sm font-semibold text-foreground">Scripts</h1>
        <span className="text-xs text-muted-foreground">· {visibleScripts.length}</span>
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
              New Script
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
            {visibleScripts.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">No scripts yet.</p>
            ) : (
              visibleScripts.map(o => (
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
                    {o.body.slice(0, 80) || '—'}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          {!selected && !isNew ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Select a script or create a new one.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Cold outreach v1"
                  className="w-full text-sm rounded-md border border-border bg-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Body</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={14}
                  placeholder="Hi {{firstName}}, this is…"
                  className="w-full text-sm font-mono rounded-md border border-border bg-card px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tokens available: <code>{'{{firstName}}'}</code>, <code>{'{{lastName}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{title}}'}</code>
                </p>
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

              {selected && (
                <Link
                  to="/analytics"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  View analytics
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
