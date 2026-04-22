import { useState, useRef, useCallback, useEffect } from 'react'
import type { CallSession, SessionStatus } from '@/types'
import { startSession, patchSession } from '@/services/callSessions'

export interface UseCallSessionReturn {
  session:        CallSession | null
  status:         SessionStatus
  elapsedSeconds: number
  localCount:     number
  start:          (dialerId?: string) => Promise<void>
  pause:          (reason?: 'manual' | 'auto') => void
  resume:         (reason?: 'manual' | 'auto') => Promise<void>
  end:            () => Promise<void>
  bumpCount:      () => void
}

export function useCallSession(): UseCallSessionReturn {
  const [session, setSession]        = useState<CallSession | null>(null)
  const [status,  setStatus]         = useState<SessionStatus>('idle')
  const [elapsedSeconds, setElapsed] = useState(0)
  const [localCount, setLocalCount]  = useState(0)

  // Mutable refs so all callbacks stay stable ([] deps) while reading current values
  const sessionRef       = useRef<CallSession | null>(null)
  const statusRef        = useRef<SessionStatus>('idle')
  const startMsRef       = useRef(0)
  const pausedMsRef      = useRef(0)
  const pauseStartRef    = useRef<number | null>(null)
  const pauseReasonRef   = useRef<'manual' | 'auto' | null>(null)
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const localCountRef    = useRef(0)

  function sync(s: SessionStatus, sess?: CallSession | null) {
    statusRef.current = s
    setStatus(s)
    if (sess !== undefined) { sessionRef.current = sess; setSession(sess) }
  }

  const tick = useCallback(() => {
    const now      = Date.now()
    const pauseMs  = pauseStartRef.current ? now - pauseStartRef.current : 0
    setElapsed(Math.max(0, Math.floor(
      (now - startMsRef.current - pausedMsRef.current - pauseMs) / 1000
    )))
  }, [])

  const start = useCallback(async (dialerId?: string) => {
    if (statusRef.current === 'running' || statusRef.current === 'paused') return
    const s = await startSession(dialerId)
    sync('running', s)
    setLocalCount(0)
    localCountRef.current = 0
    setElapsed(0)
    startMsRef.current     = Date.parse(s.startedAt)
    pausedMsRef.current    = 0
    pauseStartRef.current  = null
    pauseReasonRef.current = null
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
  }, [tick])

  const pause = useCallback((reason: 'manual' | 'auto' = 'manual') => {
    if (statusRef.current !== 'running') return
    pauseStartRef.current  = Date.now()
    pauseReasonRef.current = reason
    sync('paused')
  }, [])

  const resume = useCallback(async (reason: 'manual' | 'auto' = 'manual') => {
    if (statusRef.current !== 'paused') return
    if (reason === 'auto' && pauseReasonRef.current === 'manual') return
    const now = Date.now()
    if (pauseStartRef.current) {
      pausedMsRef.current   += now - pauseStartRef.current
      pauseStartRef.current  = null
    }
    pauseReasonRef.current = null
    sync('running')
    const s = sessionRef.current
    if (s) {
      patchSession(s.id, { totalPausedSeconds: Math.floor(pausedMsRef.current / 1000) })
        .then(u => { sessionRef.current = u; setSession(u) })
        .catch(console.error)
    }
  }, [])

  const end = useCallback(async () => {
    if (statusRef.current === 'idle' || statusRef.current === 'ended') return
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (pauseStartRef.current) {
      pausedMsRef.current  += Date.now() - pauseStartRef.current
      pauseStartRef.current = null
    }
    sync('ended')
    const s = sessionRef.current
    if (s) {
      patchSession(s.id, {
        leadsCalledCount:   localCountRef.current,
        totalPausedSeconds: Math.floor(pausedMsRef.current / 1000),
        end:                true,
      })
        .then(u => { sessionRef.current = u; setSession(u) })
        .catch(console.error)
    }
  }, [])

  const bumpCount = useCallback(() => {
    localCountRef.current += 1
    setLocalCount(localCountRef.current)
  }, [])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return { session, status, elapsedSeconds, localCount, start, pause, resume, end, bumpCount }
}
