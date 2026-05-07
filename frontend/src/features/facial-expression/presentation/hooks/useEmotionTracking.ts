import { useCallback, useEffect, useRef, useState } from 'react'
import { useFaceDetector } from './useFaceDetector'
import { HttpFacialExpressionRepository } from '../../infrastructure/repositories/HttpFacialExpressionRepository'
import type {
  EmotionEvent,
  EmotionId,
  GestureScores,
  LiveDetection,
  SessionResult,
  TrackingStatus,
} from '../../domain/FacialExpression'

/**
 * Orchestrates the emotion-tracking session lifecycle:
 *   idle -> live -> saving -> results
 *
 * The hook holds session state (start time, accumulated events) in refs so the
 * detection callback can write events at the exact instant the dominant
 * emotion changes, without waiting for a render. Status transitions are guarded
 * by a ref so a double-click on Iniciar/Detener can never run twice.
 */
export function useEmotionTracking() {
  const detector = useFaceDetector()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Session-scoped state held in refs so the detection callback (synchronous,
  // outside the render cycle) can update it without re-rendering on every frame.
  const startTimeRef = useRef<number>(0)
  const eventsRef = useRef<EmotionEvent[]>([])
  const lastEmotionRef = useRef<EmotionId | null>(null)

  // Mirror of `status` so callbacks can guard against re-entry without
  // depending on the latest closure (refs update synchronously, state doesn't).
  const statusRef = useRef<TrackingStatus>('idle')
  statusRef.current = status

  const onDetection = useCallback((live: LiveDetection) => {
    if (statusRef.current !== 'live') return
    // Only record an event when the dominant emotion actually changes.
    if (live.dominantEmotion === lastEmotionRef.current) return

    const t_ms = Math.max(0, Date.now() - startTimeRef.current)
    const activeGestures: GestureScores = {}
    for (const [id, score] of Object.entries(live.gestures)) {
      // Persist only meaningfully-active gestures so the saved row stays compact.
      if (typeof score === 'number' && score >= 0.25) {
        activeGestures[id as keyof GestureScores] = score
      }
    }

    eventsRef.current.push({
      t_ms,
      emotion: live.dominantEmotion,
      gestures: activeGestures,
    })
    lastEmotionRef.current = live.dominantEmotion
  }, [])

  // Wire the detection callback once: identity is stable thanks to its empty deps.
  useEffect(() => {
    detector.setDetectionCallback(onDetection)
    return () => detector.setDetectionCallback(null)
  }, [detector.setDetectionCallback, onDetection])

  // Start the camera as soon as the model finishes loading and the user has
  // requested live tracking.
  useEffect(() => {
    if (status === 'live' && detector.isLoaded && !detector.isCameraActive) {
      detector.startCamera()
    }
  }, [status, detector.isLoaded, detector.isCameraActive, detector])

  const startTracking = useCallback(() => {
    if (statusRef.current !== 'idle') return
    statusRef.current = 'live'
    eventsRef.current = []
    lastEmotionRef.current = null
    startTimeRef.current = Date.now()
    setError(null)
    setStatus('live')
  }, [])

  const stopTracking = useCallback(async () => {
    if (statusRef.current !== 'live') return
    statusRef.current = 'saving'
    setStatus('saving')

    const duration_ms = Math.max(0, Date.now() - startTimeRef.current)
    const events = eventsRef.current.slice()

    detector.stopCamera()

    try {
      const saved = await HttpFacialExpressionRepository.saveSession({
        duration_ms,
        events,
      })
      statusRef.current = 'results'
      setResult(saved)
      setStatus('results')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la sesión'
      statusRef.current = 'error'
      setError(msg)
      setStatus('error')
    }
  }, [detector])

  const reset = useCallback(() => {
    statusRef.current = 'idle'
    eventsRef.current = []
    lastEmotionRef.current = null
    setResult(null)
    setError(null)
    setStatus('idle')
  }, [])

  // Live duration in milliseconds, ticking once per second for the on-screen
  // chronometer. Updates only while live to avoid a stray timer in idle.
  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (status !== 'live') return
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current)
    }, 250)
    return () => clearInterval(id)
  }, [status])

  return {
    status,
    error,
    result,
    elapsedMs,

    detection: detector.detection,
    isLoaded: detector.isLoaded,
    isCameraActive: detector.isCameraActive,
    cameraError: detector.error,
    videoRef: detector.videoRef,
    setLandmarksCallback: detector.setLandmarksCallback,

    startTracking,
    stopTracking,
    reset,
  }
}
