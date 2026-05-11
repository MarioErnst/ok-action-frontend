import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HttpBodyExpressionRepository } from '../../infrastructure/repositories/HttpBodyExpressionRepository'
import { toSaveSessionDto } from '../../infrastructure/mappers/bodyExpressionMapper'
import type {
  BodyCalibration,
  BodyExpressionMetrics,
  BodyExpressionSessionResult,
  BodyExpressionStatus,
  LiveBodyMetrics,
} from '../../domain/BodyExpression'
import { BODY_EXPRESSION_PROMPTS } from '../../services/questions'
import type { PoseDetectionFrame } from '../../services/poseDetectionService'
import {
  buildBodyCalibration,
  buildInvalidFeedback,
  deriveOverallScore,
  scoreLiveFrame,
  summarizeBodyExpression,
} from '../../services/bodyExpressionAnalysis'
import { HandPresenceFilter } from '../../services/handPresenceFilter'
import { usePoseDetector } from './usePoseDetector'

const CALIBRATION_SAMPLES = 45
const MIN_SESSION_MS = 20_000

const EMPTY_LIVE: LiveBodyMetrics = {
  postureScore: 0,
  opennessScore: 0,
  framingScore: 0,
  handsVisible: false,
  poseVisible: false,
  excessiveMovement: false,
  framingMode: 'mixed',
}

export function useBodyExpressionSession() {
  const detector = usePoseDetector()
  const [status, setStatus] = useState<BodyExpressionStatus>('idle')
  const [result, setResult] = useState<BodyExpressionSessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [liveMetrics, setLiveMetrics] = useState<LiveBodyMetrics>(EMPTY_LIVE)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [promptIndex, setPromptIndex] = useState(0)

  const statusRef = useRef<BodyExpressionStatus>('idle')
  statusRef.current = status
  const calibrationFramesRef = useRef<PoseDetectionFrame[]>([])
  const sessionFramesRef = useRef<PoseDetectionFrame[]>([])
  const calibrationRef = useRef<BodyCalibration | null>(null)
  const previousFrameRef = useRef<PoseDetectionFrame | null>(null)
  const startTimeRef = useRef<number>(0)
  const handFilterRef = useRef(new HandPresenceFilter())

  const promptText = useMemo(() => BODY_EXPRESSION_PROMPTS[promptIndex], [promptIndex])

  const onFrame = useCallback((frame: PoseDetectionFrame): PoseDetectionFrame => {
    const enrichedFrame: PoseDetectionFrame = {
      ...frame,
      handPresence: handFilterRef.current.update(frame.landmarks),
    }

    if (statusRef.current === 'calibrating') {
      calibrationFramesRef.current.push(enrichedFrame)
      const collected = calibrationFramesRef.current.length
      setCalibrationProgress(Math.min(1, collected / CALIBRATION_SAMPLES))

      if (collected >= CALIBRATION_SAMPLES) {
        const calibration = buildBodyCalibration(calibrationFramesRef.current)
        calibrationFramesRef.current = []

        if (calibration.qualityPct < 45) {
          detector.stopCamera()
          statusRef.current = 'error'
          setError('La camara no pudo calibrar una postura estable. Ajusta luz, distancia y encuadre.')
          setStatus('error')
          return enrichedFrame
        }

        calibrationRef.current = calibration
        previousFrameRef.current = null
        sessionFramesRef.current = []
        handFilterRef.current.reset()
        startTimeRef.current = Date.now()
        statusRef.current = 'live'
        setElapsedMs(0)
        setLiveMetrics(EMPTY_LIVE)
        setStatus('live')
      }
      return enrichedFrame
    }

    if (statusRef.current !== 'live') return enrichedFrame
    const calibration = calibrationRef.current
    if (!calibration) return enrichedFrame

    sessionFramesRef.current.push(enrichedFrame)
    const live = scoreLiveFrame(enrichedFrame, calibration, previousFrameRef.current)
    previousFrameRef.current = enrichedFrame
    setLiveMetrics(live)
    return enrichedFrame
  }, [detector])

  useEffect(() => {
    detector.setFrameCallback(onFrame)
    return () => detector.setFrameCallback(null)
  }, [detector.setFrameCallback, onFrame])

  useEffect(() => {
    if (
      (status === 'calibrating' || status === 'live') &&
      detector.isLoaded &&
      !detector.isCameraActive
    ) {
      detector.startCamera()
    }
  }, [status, detector.isLoaded, detector.isCameraActive, detector])

  useEffect(() => {
    if (!detector.error || (status !== 'calibrating' && status !== 'live')) return
    detector.stopCamera()
    statusRef.current = 'error'
    setError(detector.error)
    setStatus('error')
  }, [detector, detector.error, status])

  useEffect(() => {
    if (status !== 'live') return
    const id = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 250)
    return () => clearInterval(id)
  }, [status])

  const startSession = useCallback(() => {
    if (statusRef.current !== 'idle') return
    calibrationFramesRef.current = []
    sessionFramesRef.current = []
    calibrationRef.current = null
    previousFrameRef.current = null
    handFilterRef.current.reset()
    statusRef.current = 'calibrating'
    setResult(null)
    setError(null)
    setCalibrationProgress(0)
    setLiveMetrics(EMPTY_LIVE)
    setStatus('calibrating')
  }, [])

  const stopSession = useCallback(async () => {
    if (statusRef.current !== 'live') return
    const endedAt = new Date()
    const durationMs = Math.max(0, endedAt.getTime() - startTimeRef.current)
    const calibration = calibrationRef.current
    const frames = sessionFramesRef.current.slice()

    detector.stopCamera()
    statusRef.current = 'saving'
    setStatus('saving')

    if (!calibration) {
      const metrics = createZeroMetrics()
      setResult(createInvalidResult(durationMs, metrics, 'No se completo la calibracion.'))
      statusRef.current = 'results'
      setStatus('results')
      return
    }

    const metrics = summarizeBodyExpression(frames, calibration)
    const score = deriveOverallScore(metrics)
    const startedAt = new Date(endedAt.getTime() - durationMs)

    if (durationMs < MIN_SESSION_MS) {
      setResult(createInvalidResult(durationMs, metrics, 'Habla al menos 20 segundos para guardar una medicion.'))
      statusRef.current = 'results'
      setStatus('results')
      return
    }

    if (metrics.trackedPct < 40) {
      setResult(createInvalidResult(durationMs, metrics, 'La pose fue visible menos del 40% de la sesion.'))
      statusRef.current = 'results'
      setStatus('results')
      return
    }

    try {
      const saved = await HttpBodyExpressionRepository.saveSession(
        toSaveSessionDto(startedAt.toISOString(), endedAt.toISOString(), promptText, metrics),
      )
      setResult(saved)
      statusRef.current = 'results'
      setStatus('results')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la sesion.'
      setResult({
        id: null,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs,
        score,
        status: 'error',
        metrics,
        feedback: buildInvalidFeedback(message),
        saved: false,
        invalidReason: message,
      })
      statusRef.current = 'results'
      setStatus('results')
    }
  }, [detector, promptText])

  const resetSession = useCallback(() => {
    detector.stopCamera()
    statusRef.current = 'idle'
    calibrationFramesRef.current = []
    sessionFramesRef.current = []
    calibrationRef.current = null
    previousFrameRef.current = null
    handFilterRef.current.reset()
    setStatus('idle')
    setResult(null)
    setError(null)
    setElapsedMs(0)
    setCalibrationProgress(0)
    setLiveMetrics(EMPTY_LIVE)
  }, [detector])

  const nextPrompt = useCallback(() => {
    if (statusRef.current !== 'idle') return
    setPromptIndex((current) => (current + 1) % BODY_EXPRESSION_PROMPTS.length)
  }, [])

  return {
    status,
    result,
    error,
    elapsedMs,
    calibrationProgress,
    liveMetrics,
    promptText,
    isLoaded: detector.isLoaded,
    isCameraActive: detector.isCameraActive,
    cameraError: detector.error,
    videoRef: detector.videoRef,
    attachStream: detector.attachStream,
    setLandmarksCallback: detector.setLandmarksCallback,
    startSession,
    stopSession,
    resetSession,
    nextPrompt,
  }
}

function createInvalidResult(
  durationMs: number,
  metrics: BodyExpressionMetrics,
  reason: string,
): BodyExpressionSessionResult {
  const endedAt = new Date()
  const startedAt = new Date(endedAt.getTime() - durationMs)
  return {
    id: null,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs,
    score: deriveOverallScore(metrics),
    status: 'invalid',
    metrics,
    feedback: buildInvalidFeedback(reason),
    saved: false,
    invalidReason: reason,
  }
}

function createZeroMetrics(): BodyExpressionMetrics {
  return {
    postureScore: 0,
    opennessScore: 0,
    gestureScore: 0,
    stabilityScore: 0,
    energyScore: 0,
    framingScore: 0,
    trackedPct: 0,
    handsVisiblePct: 0,
    excessiveMovementPct: 0,
    calibrationQualityPct: 0,
    framingMode: 'mixed',
  }
}
