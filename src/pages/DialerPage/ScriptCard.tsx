import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { ScrollText, Pencil, Eye, Copy, Flag, Save as SaveIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fillTokens, CALL_TOKEN_HINTS } from '@/lib/tokens'
import { postScriptFeedback } from '@/services/scripts'
import type { Script, Dialer } from '@/types'
import type { TokenData } from '@/lib/tokens'

interface ScriptCardProps {
  scripts: Script[]
  currentDialer: Dialer | null
  currentScript: Script | null
  tokenData: TokenData
  lastCallLogId: string | null
  selectScriptForCurrentDialer: (id: string | null) => Promise<void>
  editScript: (id: string, name: string, body: string) => Promise<Script>
}

const EMPTY_SCRIPT = ''

export function ScriptCard({
  scripts, currentDialer, currentScript, tokenData, lastCallLogId,
  selectScriptForCurrentDialer, editScript,
}: ScriptCardProps) {
  const [editingScript, setEditingScript] = useState(false)
  const [scriptDraft, setScriptDraft]     = useState(currentScript?.body ?? EMPTY_SCRIPT)
  const [scriptSaving, setScriptSaving]   = useState(false)

  const [flagOpen, setFlagOpen]   = useState(false)
  const [flagNote, setFlagNote]   = useState('')
  const [flagSaving, setFlagSaving] = useState(false)

  useEffect(() => {
    setScriptDraft(currentScript?.body ?? EMPTY_SCRIPT)
    setEditingScript(false)
  }, [currentScript?.id])

  const scriptDirty = currentScript != null && scriptDraft !== currentScript.body
  const scriptBodyForDisplay = editingScript ? scriptDraft : (currentScript?.body ?? EMPTY_SCRIPT)
  const filledScript = fillTokens(scriptBodyForDisplay, tokenData)

  async function handleSaveScript() {
    if (!currentScript || !scriptDirty) return
    setScriptSaving(true)
    try { await editScript(currentScript.id, currentScript.name, scriptDraft) }
    finally { setScriptSaving(false) }
  }

  async function handleFlagIssue() {
    if (!currentScript || !flagNote.trim()) return
    setFlagSaving(true)
    try {
      await postScriptFeedback(currentScript.id, {
        callLogId:    lastCallLogId ?? undefined,
        dialerId:     currentDialer?.id,
        note:         flagNote.trim(),
        bodySnapshot: currentScript.body,
      })
      setFlagNote('')
      setFlagOpen(false)
    } finally {
      setFlagSaving(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ScrollText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={currentScript?.id ?? ''}
              onChange={e => selectScriptForCurrentDialer(e.target.value || null)}
              disabled={!currentDialer}
              className="min-w-0 flex-1 text-xs font-medium bg-muted border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground disabled:opacity-50"
            >
              <option value="">— Select script —</option>
              {scripts.filter(o => !o.isArchived).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <Link
              to="/scripts"
              title="Manage scripts"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigator.clipboard.writeText(filledScript)}
              title="Copy filled script"
              disabled={!currentScript}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setFlagOpen(true)}
              title="Flag issue with this script"
              disabled={!currentScript}
              className="p-1.5 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors disabled:opacity-40"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditingScript(v => !v)}
              disabled={!currentScript}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              {editingScript ? <><Eye className="h-3.5 w-3.5" /> Preview</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
            </button>
          </div>
        </div>

        {!currentScript ? (
          <div className="bg-muted/50 border border-border rounded-lg px-4 py-8 text-center text-xs text-muted-foreground">
            {currentDialer
              ? <>No script selected. <Link to="/scripts" className="text-blue-600 hover:underline">Create or pick one</Link>.</>
              : <>Select a dialer to use scripts.</>}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CALL_TOKEN_HINTS.map(token => (
                <button
                  key={token}
                  onClick={() => { if (editingScript) setScriptDraft(d => d + token) }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono border transition-colors',
                    editingScript
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer'
                      : 'bg-muted text-muted-foreground border-border cursor-default'
                  )}
                >
                  {token}
                </button>
              ))}
            </div>

            {editingScript ? (
              <>
                <textarea
                  value={scriptDraft}
                  onChange={e => setScriptDraft(e.target.value)}
                  rows={14}
                  className="w-full text-sm bg-muted border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-mono leading-relaxed resize-none"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleSaveScript}
                    disabled={!scriptDirty || scriptSaving}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <SaveIcon className="h-3.5 w-3.5" />
                    {scriptSaving ? 'Saving…' : 'Save'}
                  </button>
                  {scriptDirty && (
                    <button
                      onClick={() => setScriptDraft(currentScript.body)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                    >
                      Revert
                    </button>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Global — edits affect all dialers using this script
                  </span>
                </div>
              </>
            ) : (
              <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[200px]">
                {filledScript}
              </div>
            )}
          </>
        )}
      </div>

      {/* Flag issue modal */}
      {flagOpen && currentScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFlagOpen(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-foreground">Flag Script Issue</h3>
              </div>
              <button onClick={() => setFlagOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Script: <span className="font-medium text-foreground">{currentScript.name}</span>
              {lastCallLogId && <div className="mt-1">Linked to your last logged call.</div>}
            </div>
            <textarea
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              placeholder="Where did it fail? What line needs to change?"
              rows={5}
              className="w-full text-xs bg-muted border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setFlagOpen(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
              <button
                onClick={handleFlagIssue}
                disabled={!flagNote.trim() || flagSaving}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Flag className="h-3.5 w-3.5" />
                {flagSaving ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
