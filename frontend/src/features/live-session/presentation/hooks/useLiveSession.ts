import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '../../../../api/client'
import useAudioRecorder from '../../../../shared/hooks/useAudioRecorder'
import type {
  ComposedEvaluation,
  LiveModule,
  LiveSessionPhase,
} from '../../domain/LiveSession'
import { HttpLiveSessionRepository } from '../../infrastructure/repositories/HttpLiveSessionRepository'

const MAX_SESSION_SECONDS = 300

interface UseLiveSessionResult {
  phase: LiveSessionPhase
  selectedModules: LiveModule[]
  elapsedSeconds: number
  evaluation: ComposedEvaluation | null
  liveScore: number | null
  error: string | null
  activeStream: MediaStream | null
  isRecording: boolean
  toggleModule: (module: LiveModule) => void
  start: () => Promise<void>
  stop: () => Promise<void>
  reset: () => void
}

// Orchestrates the new live session lifecycle: open the live row,
// capture audio with MediaRecorder, send the blob to the composed
// audio-evaluation endpoint, finalize, and surface the per-module
// results. Audio capture uses the shared useAudioRecorder hook so the
// MIME-type detection (mp4 on iOS, webm elsewhere) is consistent with
// the rest of the app.
export function useLiveSession(): UseLiveSessionResult {
  const [phase, setPhase] = useState<LiveSessionPhase>('selection')
  const [selectedModules, setSelectedModules] = useState<LiveModule[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [evaluation, setEvaluation] = useState<ComposedEvaluation | null>(null)
  const [liveScore, setLiveScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isStoppingRef = useRef(false)

  const recorder = useAudioRecorder()

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    recorder.releaseResources()
    sessionIdRef.current = null
    startedAtRef.current = null
    isStoppingRef.current = false
    setSelectedModules([])
    setElapsedSeconds(0)
    setEvaluation(null)
    setLiveScore(null)
    setError(null)
    setPhase('selection')
  }, [clearTimer, recorder])

  const toggleModule = useCallback((module: LiveModule) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    )
  }, [])

  // Defined before start() because start() schedules it via setTimeout when
  // hitting the time limit, but stop() also runs explicitly on user click.
  // We capture the live state through refs so the closure does not go
  // stale across re-renders.
  const stop = useCallback(async () => {
    if (isStoppingRef.current) return
    isStoppingRef.current = true
    clearTimer()

    const sessionId = sessionIdRef.current
    const startedAt = startedAtRef.current
    if (!sessionId || !startedAt) {
      setError('La sesión no estaba activa')
      setPhase('error')
      return
    }

    let audioBlob: Blob
    try {
      audioBlob = await recorder.stopRecording()
    } catch (exc) {
      setError(
        exc instanceof Error ? exc.message : 'No se pudo detener la grabación',
      )
      setPhase('error')
      return
    }

    setPhase('evaluating')

    try {
      const evalResponse = await HttpLiveSessionRepository.evaluateAudio(
        sessionId,
        {
          audio: audioBlob,
          modules: selectedModules,
          startedAt,
        },
      )
      setEvaluation(evalResponse.evaluation)

      const finalize = await HttpLiveSessionRepository.finalizeSession(sessionId)
      setLiveScore(finalize.score)
      setPhase('summary')
    } catch (exc) {
      const message =
        exc instanceof ApiError
          ? exc.message || 'Error evaluando el audio'
          : 'Error de red durante la evaluación'
      setError(message)
      setPhase('error')
    }
  }, [clearTimer, recorder, selectedModules])

  const start = useCallback(async () => {
    if (selectedModules.length === 0) {
      setError('Selecciona al menos un módulo')
      return
    }
    setError(null)

    let liveResponse
    try {
      liveResponse = await HttpLiveSessionRepository.startSession()
    } catch (exc) {
      setError(
        exc instanceof ApiError ? exc.message : 'No se pudo abrir la sesión live',
      )
      return
    }
    sessionIdRef.current = liveResponse.session_id
    startedAtRef.current = liveResponse.started_at

    try {
      await recorder.startRecording()
    } catch (exc) {
      // Roll back the live session if the user denied microphone access
      // so we don't leave an orphan active row in BD.
      await HttpLiveSessionRepository.abandonSession(
        liveResponse.session_id,
        'error',
      ).catch(() => {})
      sessionIdRef.current = null
      startedAtRef.current = null
      setError(
        exc instanceof Error
          ? exc.message
          : 'No se pudo acceder al micrófono',
      )
      return
    }

    isStoppingRef.current = false
    setElapsedSeconds(0)
    setPhase('recording')

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1
        if (next >= MAX_SESSION_SECONDS) {
          // The setInterval callback cannot await, so we schedule stop()
          // after committing the new elapsed value. stop() guards itself
          // against double-entry via isStoppingRef.
          void stop()
        }
        return next
      })
    }, 1000)
  }, [recorder, selectedModules, stop])

  // On unmount: stop the recorder cleanly and best-effort abandon the live
  // row. We cannot await async work in cleanup, so abandon is fire-and-
  // forget — the row may stay 'active' in BD if the user closes the tab,
  // which is a known limitation, not a bug.
  useEffect(() => {
    return () => {
      clearTimer()
      recorder.releaseResources()
      const orphanId = sessionIdRef.current
      if (orphanId && (phase === 'recording' || phase === 'evaluating')) {
        void HttpLiveSessionRepository.abandonSession(orphanId, 'user_stop').catch(
          () => {},
        )
      }
    }
    // We only want this effect's cleanup to run on unmount, hence the empty
    // dep array. Reading phase/sessionIdRef inside is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    phase,
    selectedModules,
    elapsedSeconds,
    evaluation,
    liveScore,
    error,
    activeStream: recorder.activeStream,
    isRecording: recorder.isRecording,
    toggleModule,
    start,
    stop,
    reset,
  }
}
