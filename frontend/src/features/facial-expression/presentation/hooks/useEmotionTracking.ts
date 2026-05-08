import { useCallback, useEffect, useRef, useState } from 'react'
import { useFaceDetector } from './useFaceDetector'
import { HttpFacialExpressionRepository } from '../../infrastructure/repositories/HttpFacialExpressionRepository'
import type { BlendshapeCategory } from '../../services/faceDetectionService'
import type {
  BlendshapeBaseline,
  EmotionEvent,
  EmotionId,
  GestureScores,
  LiveDetection,
  SessionResult,
  TrackingStatus,
} from '../../domain/FacialExpression'

// Calibration: capture roughly 3 seconds of neutral face at ~15fps. We sample
// from the raw detection callback (which fires once per detected frame), so
// frame count is the natural progress unit instead of wall time.
const CALIBRATION_SAMPLES = 45

/**
 * Orchestrates the emotion-tracking session lifecycle:
 *   idle → calibrating → live → saving → results
 *
 * The hook owns the per-session refs (start time, accumulated events,
 * baseline). Status transitions are guarded by a ref so a synchronous
 * double-click on Iniciar/Detener can never run a handler twice.
 */
export function useEmotionTracking() {
  const detector = useFaceDetector()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calibrationProgress, setCalibrationProgress] = useState(0)

  // Session-scoped state held in refs so the detection callback (synchronous,
  // outside the render cycle) can update it without re-rendering on every frame.
  const startTimeRef = useRef<number>(0)
  const eventsRef = useRef<EmotionEvent[]>([])
  const lastEmotionRef = useRef<EmotionId | null>(null)
  const calibrationSamplesRef = useRef<BlendshapeCategory[][]>([])

  // Mirror of `status` so callbacks can guard against re-entry without
  // depending on the latest closure (refs update synchronously, state doesn't).
  const statusRef = useRef<TrackingStatus>('idle')
  statusRef.current = status

  const onDetection = useCallback((live: LiveDetection) => {
    if (statusRef.current !== 'live') return
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

  // Sample raw blendshapes during calibration. When we have enough samples,
  // average them into a baseline, hand it to the detector, and switch to live.
  const onRawBlendshapes = useCallback(
    (cats: BlendshapeCategory[]) => {
      if (statusRef.current !== 'calibrating') return

      calibrationSamplesRef.current.push(cats)
      const collected = calibrationSamplesRef.current.length
      setCalibrationProgress(Math.min(1, collected / CALIBRATION_SAMPLES))

      if (collected >= CALIBRATION_SAMPLES) {
        const baseline = averageBaseline(calibrationSamplesRef.current)
        detector.setBaseline(baseline)
        calibrationSamplesRef.current = []

        // Move into the live phase. Reset event buffer and start the clock.
        statusRef.current = 'live'
        eventsRef.current = []
        lastEmotionRef.current = null
        startTimeRef.current = Date.now()
        setStatus('live')
      }
    },
    [detector],
  )

  // Wire detection callbacks once. Identities are stable thanks to empty deps.
  useEffect(() => {
    detector.setDetectionCallback(onDetection)
    detector.setRawBlendshapesCallback(onRawBlendshapes)
    return () => {
      detector.setDetectionCallback(null)
      detector.setRawBlendshapesCallback(null)
    }
  }, [
    detector.setDetectionCallback,
    detector.setRawBlendshapesCallback,
    onDetection,
    onRawBlendshapes,
  ])

  // Start the camera as soon as the model finishes loading and the user has
  // requested tracking (during either calibration or live).
  useEffect(() => {
    if (
      (status === 'calibrating' || status === 'live') &&
      detector.isLoaded &&
      !detector.isCameraActive
    ) {
      detector.startCamera()
    }
  }, [status, detector.isLoaded, detector.isCameraActive, detector])

  const startTracking = useCallback(() => {
    if (statusRef.current !== 'idle') return
    statusRef.current = 'calibrating'
    calibrationSamplesRef.current = []
    eventsRef.current = []
    lastEmotionRef.current = null
    detector.setBaseline(null)
    setCalibrationProgress(0)
    setError(null)
    setStatus('calibrating')
  }, [detector])

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
    calibrationSamplesRef.current = []
    lastEmotionRef.current = null
    detector.setBaseline(null)
    setResult(null)
    setError(null)
    setCalibrationProgress(0)
    setStatus('idle')
  }, [detector])

  // Live duration in milliseconds, ticking 4x/sec for the on-screen chronometer.
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
    calibrationProgress,

    detection: detector.detection,
    isLoaded: detector.isLoaded,
    isCameraActive: detector.isCameraActive,
    cameraError: detector.error,
    videoRef: detector.videoRef,
    attachStream: detector.attachStream,
    setLandmarksCallback: detector.setLandmarksCallback,

    startTracking,
    stopTracking,
    reset,
  }
}

/**
 * Average each blendshape across the calibration samples to produce a baseline.
 * Missing categories in a sample are treated as 0 so the average stays stable
 * even if MediaPipe occasionally drops a category.
 */
function averageBaseline(samples: BlendshapeCategory[][]): BlendshapeBaseline {
  if (samples.length === 0) return {}
  const sums: Record<string, number> = {}
  for (const sample of samples) {
    for (const cat of sample) {
      sums[cat.categoryName] = (sums[cat.categoryName] ?? 0) + cat.score
    }
  }
  const baseline: BlendshapeBaseline = {}
  for (const [key, total] of Object.entries(sums)) {
    baseline[key] = total / samples.length
  }
  return baseline
}
