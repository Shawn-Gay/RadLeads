import { Timer, Pause, Play, Square } from 'lucide-react'
import { useDialerContext } from '@/context/DialerContext'

function fmt(totalSeconds: number): string {
  const h  = Math.floor(totalSeconds / 3600)
  const m  = Math.floor((totalSeconds % 3600) / 60)
  const s  = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function SessionTimer() {
  const {
    sessionStatus, sessionElapsed, sessionCallCount,
    startSession, pauseSession, resumeSession, endSession,
  } = useDialerContext()

  const isPaused = sessionStatus === 'paused'
  const isEnded  = sessionStatus === 'ended'
  const isIdle   = sessionStatus === 'idle'
  const avg      = sessionCallCount > 0
    ? Math.round(sessionElapsed / sessionCallCount)
    : null

  return (
    <div className="flex items-center gap-2.5 px-4 py-1.5 border-b border-border bg-muted/30 text-xs shrink-0">
      <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {isIdle ? (
        <span className="text-muted-foreground">Session not started</span>
      ) : (
        <>
          <span className="font-mono font-semibold tabular-nums">{fmt(sessionElapsed)}</span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">
            {sessionCallCount} {sessionCallCount === 1 ? 'call' : 'calls'}
          </span>
          {avg !== null && (
            <>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">avg {fmt(avg)}/call</span>
            </>
          )}
          {isPaused && (
            <>
              <span className="text-border">·</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium animate-pulse">Paused</span>
            </>
          )}
          {isEnded && (
            <>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">Session ended</span>
            </>
          )}
        </>
      )}

      <div className="flex items-center gap-1">
        {isIdle || isEnded ? (
          <button
            onClick={startSession}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors font-medium"
            title="Start session"
          >
            <Play className="h-3 w-3" /><span>{isEnded ? 'New session' : 'Start'}</span>
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? () => void resumeSession() : () => pauseSession()}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isPaused ? 'Resume session' : 'Pause session'}
            >
              {isPaused
                ? <><Play  className="h-3 w-3" /><span>Resume</span></>
                : <><Pause className="h-3 w-3" /><span>Pause</span></>
              }
            </button>
            <button
              onClick={() => void endSession()}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              title="End session"
            >
              <Square className="h-3 w-3" /><span>End</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
