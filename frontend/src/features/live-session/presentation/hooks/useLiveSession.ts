import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '../../../../api/client'
import type {
  ComposedEvaluation,
  FacialEmotionName,
  FacialExpressionSection,
  LiveModule,
  LiveSessionPhase,
} from '../../domain/LiveSession'
import type { FacialSummaryPayload } from '../../domain/FacialSummary'
import type { RawEmotionName } from '../../domain/EmotionTrigger'
import type { AutoStopReasonDto } from '../../infrastructure/dto/LiveSessionDtos'
import type { FrameModuleDto } from '../../infrastructure/dto/FrameEvaluationDtos'
import type { AudioFrameEvent } from '../../services/audioFraming/frameRecorder'
import { HttpLiveSessionRepository } from '../../infrastructure/repositories/HttpLiveSessionRepository'
import { calibrateNoiseFloor } from '../../services/audioFraming/noiseCalibrator'
import { PauseDetector } from '../../services/audioFraming/pauseDetector'
import { FrameRecorder } from '../../services/audioFraming/frameRecorder'
import { FacialSummaryBuilder } from '../../services/emotionMonitor/facialSummaryBuilder'
import { LiveFaceLoop, type BlendshapeBaseline } from '../../services/emotionMonitor/liveFaceLoop'
import { useFrameStrikes } from './useFrameStrikes'
import { useEmotionStop } from './useEmotionStop'

const MAX_SESSION_SECONDS = 300
const CALIBRATION_MS = 2000
const STOPPED_TRANSITION_MS = 2000
const MAX_INFLIGHT_FRAMES = 3

type StopReason = 'user_stop' | 'time_limit' | AutoStopReasonDto

const FRAME_AUDIO_MODULES: ReadonlyArray<LiveModule> = [
  'muletillas',
  'accentuation',
  'pronunciation',
]

const EMOTION_LABEL: Record<RawEmotionName, string> = {
  happy: 'felicidad',
  sad: 'tristeza',
  angry: 'enojo',
  surprise: 'sorpresa',
  fear: 'miedo',
  disgust: 'disgusto',
  neutral: 'neutralidad',
}

const RAW_TO_FACIAL: Record<RawEmotionName, FacialEmotionName> = {
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprise: 'surprised',
  fear: 'fearful',
  disgust: 'disgusted',
  neutral: 'neutral',
}

interface UseLiveSessionResult {
  phase: LiveSessionPhase
  selectedModules: LiveModule[]
  elapsedSeconds: number
  evaluation: ComposedEvaluation | null
  liveScore: number | null
  error: string | null
  activeStream: MediaStream | null
  videoStream: MediaStream | null
  isRecording: boolean
  calibrationProgress: number
  strikeEvents: ReturnType<typeof useFrameStrikes>['events']
  stopReason: StopReason | null
  emotionTriggerLabel: string | null
  recordingAudioUrl: string | null
  recordingDurationMs: number
  toggleModule: (module: LiveModule) => void
  start: () => Promise<void>
  stop: () => Promise<void>
  reset: () => void
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

function buildFacialSection(summary: FacialSummaryPayload): FacialExpressionSection {
  const keys: Array<keyof FacialSummaryPayload> = [
    'happy_pct',
    'sad_pct',
    'angry_pct',
    'surprised_pct',
    'fearful_pct',
    'disgusted_pct',
    'neutral_pct',
  ]
  let topKey: keyof FacialSummaryPayload = 'neutral_pct'
  for (const key of keys) {
    if (summary[key] > summary[topKey]) topKey = key
  }
  const keyToEmotion: Record<keyof FacialSummaryPayload, FacialEmotionName> = {
    happy_pct: 'happy',
    sad_pct: 'sad',
    angry_pct: 'angry',
    surprised_pct: 'surprised',
    fearful_pct: 'fearful',
    disgusted_pct: 'disgusted',
    neutral_pct: 'neutral',
  }
  const expressiveness = Math.max(0, Math.min(100, 100 - summary.neutral_pct))
  return {
    expressiveness_score: expressiveness,
    top_emotion: keyToEmotion[topKey],
    happy_pct: summary.happy_pct,
    sad_pct: summary.sad_pct,
    angry_pct: summary.angry_pct,
    surprised_pct: summary.surprised_pct,
    fearful_pct: summary.fearful_pct,
    disgusted_pct: summary.disgusted_pct,
    neutral_pct: summary.neutral_pct,
  }
}

export function useLiveSession(): UseLiveSessionResult {
  const [phase, setPhase] = useState<LiveSessionPhase>('selection')
  const [selectedModules, setSelectedModules] = useState<LiveModule[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [evaluation, setEvaluation] = useState<ComposedEvaluation | null>(null)
  const [liveScore, setLiveScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [stopReason, setStopReason] = useState<StopReason | null>(null)
  const [emotionTriggerLabel, setEmotionTriggerLabel] = useState<string | null>(null)
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string | null>(null)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)

  const facialEnabled = selectedModules.includes('facial_expression')
  const strikes = useFrameStrikes()
  const emotionStop = useEmotionStop({ enabled: facialEnabled })

  // Refs for long-lived resources that should not trigger renders.
  const sessionIdRef = useRef<string | null>(null)
  const startedAtIsoRef = useRef<string | null>(null)
  const recordingStartedAtMsRef = useRef(0)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mainRecorderRef = useRef<MediaRecorder | null>(null)
  const mainChunksRef = useRef<Blob[]>([])
  const pauseDetectorRef = useRef<PauseDetector | null>(null)
  const frameRecorderRef = useRef<FrameRecorder | null>(null)
  const faceLoopRef = useRef<LiveFaceLoop | null>(null)
  const facialSummaryBuilderRef = useRef<FacialSummaryBuilder | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightFramesRef = useRef(0)
  const evaluatedSoFarSecondsRef = useRef(0)
  const isStoppingRef = useRef(false)
  // Single AbortController per session that fires on triggerStop, so
  // in-flight evaluate-frame requests do not land on the backend after
  // the session row is already aborted/completed (those would 422).
  const frameAbortRef = useRef<AbortController | null>(null)
  const selectedModulesRef = useRef<LiveModule[]>([])
  const phaseRef = useRef<LiveSessionPhase>('selection')
  const stopReasonRef = useRef<StopReason | null>(null)
  // Facial baseline accumulation. While facialPhase is 'calibrating' we
  // sum blendshape activations per category so we can build the user's
  // neutral-face baseline at the moment the calibration window closes.
  // Once facialPhase flips to 'live' we stop summing and pass the
  // baseline into classify() so emotion scores reflect deltas above
  // neutral rather than absolute activations.
  const facialPhaseRef = useRef<'calibrating' | 'live'>('calibrating')
  const baselineSumRef = useRef<Map<string, number>>(new Map())
  const baselineCountRef = useRef(0)
  const finalBaselineRef = useRef<BlendshapeBaseline | null>(null)

  // Keep refs in sync with state so closures can read fresh values.
  useEffect(() => {
    selectedModulesRef.current = selectedModules
  }, [selectedModules])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const clearElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }, [])

  const releaseAudioGraph = useCallback(async () => {
    try {
      await audioContextRef.current?.close()
    } catch {
      // Closing twice or after the context is already closed throws on
      // some browsers; safe to ignore for tear-down.
    }
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

  const releaseStreams = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach((t) => t.stop())
    audioStreamRef.current = null
    setActiveStream(null)
    // The video stream is owned by LiveFaceLoop; loop.stop() releases it.
    setVideoStream(null)
  }, [])

  const stopMainRecorder = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mainRecorderRef.current
      if (!recorder) {
        const mime = pickMimeType() || 'audio/webm'
        resolve(new Blob(mainChunksRef.current, { type: mime }))
        return
      }
      const finalize = () => {
        const mime = recorder.mimeType || 'audio/webm'
        const blob = new Blob(mainChunksRef.current, { type: mime })
        mainChunksRef.current = []
        mainRecorderRef.current = null
        resolve(blob)
      }
      recorder.onstop = finalize
      if (recorder.state === 'inactive') {
        finalize()
      } else {
        recorder.stop()
      }
    })
  }, [])

  const reset = useCallback(() => {
    clearElapsedTimer()
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }
    pauseDetectorRef.current?.stop()
    pauseDetectorRef.current = null
    void frameRecorderRef.current?.stop()
    frameRecorderRef.current = null
    faceLoopRef.current?.stop()
    faceLoopRef.current = null
    facialSummaryBuilderRef.current = null
    void releaseAudioGraph()
    releaseStreams()
    if (recordingAudioUrl) {
      URL.revokeObjectURL(recordingAudioUrl)
    }

    sessionIdRef.current = null
    startedAtIsoRef.current = null
    recordingStartedAtMsRef.current = 0
    mainChunksRef.current = []
    mainRecorderRef.current = null
    inFlightFramesRef.current = 0
    evaluatedSoFarSecondsRef.current = 0
    isStoppingRef.current = false
    stopReasonRef.current = null
    facialPhaseRef.current = 'calibrating'
    baselineSumRef.current = new Map()
    baselineCountRef.current = 0
    finalBaselineRef.current = null
    frameAbortRef.current?.abort()
    frameAbortRef.current = null

    setSelectedModules([])
    setElapsedSeconds(0)
    setEvaluation(null)
    setLiveScore(null)
    setError(null)
    setIsRecording(false)
    setCalibrationProgress(0)
    setStopReason(null)
    setEmotionTriggerLabel(null)
    setRecordingAudioUrl(null)
    setRecordingDurationMs(0)
    strikes.reset()
    emotionStop.reset()
    setPhase('selection')
  }, [clearElapsedTimer, releaseAudioGraph, releaseStreams, recordingAudioUrl, strikes, emotionStop])

  const toggleModule = useCallback((module: LiveModule) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    )
  }, [])

  // Submits one cut frame to the backend. Drops frames silently when
  // either no audio modules are tildados, the in-flight queue is
  // saturated, or the request errors out. Strike state only updates
  // when a frame round-trips successfully.
  const submitFrame = useCallback(
    async (event: AudioFrameEvent) => {
      const sessionId = sessionIdRef.current
      if (!sessionId) return
      const audioModules = selectedModulesRef.current.filter((m): m is FrameModuleDto =>
        FRAME_AUDIO_MODULES.includes(m),
      )
      if (audioModules.length === 0) return
      if (inFlightFramesRef.current >= MAX_INFLIGHT_FRAMES) return
      inFlightFramesRef.current++
      evaluatedSoFarSecondsRef.current = Math.max(
        evaluatedSoFarSecondsRef.current,
        Math.floor(event.startMsRelative / 1000),
      )
      try {
        const response = await HttpLiveSessionRepository.evaluateFrame(
          sessionId,
          event.blob,
          event.frameIndex,
          audioModules,
          evaluatedSoFarSecondsRef.current,
          frameAbortRef.current?.signal,
        )
        strikes.registerFrameResponse(response)
      } catch {
        // Frame loss tolerated: the counter just stays the same and the
        // next frame will land in 5 to 8 seconds. AbortError (from the
        // stop watcher) and 502 (Gemini timeout) both land here.
      } finally {
        inFlightFramesRef.current--
      }
    },
    [strikes],
  )

  const runEvaluation = useCallback(
    async (audioBlob: Blob, reason: StopReason) => {
      const sessionId = sessionIdRef.current
      const startedAtIso = startedAtIsoRef.current
      if (!sessionId || !startedAtIso) {
        setError('La sesión no estaba activa')
        setPhase('error')
        return
      }

      let facialSummary: FacialSummaryPayload | undefined
      if (selectedModulesRef.current.includes('facial_expression')) {
        const built = facialSummaryBuilderRef.current?.build()
        facialSummary = built ?? undefined
      }

      try {
        const evalResponse = await HttpLiveSessionRepository.evaluateAudio(sessionId, {
          audio: audioBlob,
          modules: selectedModulesRef.current,
          startedAt: startedAtIso,
          facialSummary,
        })

        const composed: ComposedEvaluation = { ...evalResponse.evaluation }
        if (facialSummary) {
          composed.facial_expression = buildFacialSection(facialSummary)
        }
        setEvaluation(composed)

        const autoStopReason: AutoStopReasonDto | null =
          reason === 'auto_stop_strikes'
            ? 'auto_stop_strikes'
            : reason === 'auto_stop_emotion'
              ? 'auto_stop_emotion'
              : null
        const finalize = await HttpLiveSessionRepository.finalizeSession(sessionId, autoStopReason)
        setLiveScore(finalize.score)

        if (reason === 'user_stop' || reason === 'time_limit') {
          setPhase('summary')
        }
        // For auto-stop, the stopped_transition timer handles the phase
        // flip to 'stopped_feedback'. Evaluation arriving early is fine:
        // the feedback page reads from state and re-renders.
      } catch (exc) {
        const message =
          exc instanceof ApiError
            ? exc.message || 'Error evaluando el audio'
            : 'Error de red durante la evaluación'
        setError(message)
        setPhase('error')
      }
    },
    [],
  )

  const triggerStop = useCallback(
    async (reason: StopReason) => {
      if (isStoppingRef.current) return
      isStoppingRef.current = true
      stopReasonRef.current = reason

      clearElapsedTimer()
      // Abort any evaluate-frame requests that are still in flight so
      // they do not 422 on the backend after the session row has been
      // closed by the finalize call below.
      frameAbortRef.current?.abort()
      pauseDetectorRef.current?.stop()
      pauseDetectorRef.current = null
      await frameRecorderRef.current?.stop()
      frameRecorderRef.current = null
      faceLoopRef.current?.stop()

      const fullBlob = await stopMainRecorder()
      await releaseAudioGraph()
      releaseStreams()

      const endedAt = performance.now()
      const recordingMs = recordingStartedAtMsRef.current
        ? Math.max(0, endedAt - recordingStartedAtMsRef.current)
        : 0
      const url = URL.createObjectURL(fullBlob)

      setIsRecording(false)
      setStopReason(reason)
      setRecordingAudioUrl(url)
      setRecordingDurationMs(recordingMs)

      const isAuto = reason === 'auto_stop_strikes' || reason === 'auto_stop_emotion'
      if (isAuto) {
        setPhase('stopped_transition')
        transitionTimeoutRef.current = setTimeout(() => {
          setPhase('stopped_feedback')
          transitionTimeoutRef.current = null
        }, STOPPED_TRANSITION_MS)
      } else {
        setPhase('evaluating')
      }

      void runEvaluation(fullBlob, reason)
    },
    [clearElapsedTimer, releaseAudioGraph, releaseStreams, stopMainRecorder, runEvaluation],
  )

  const stop = useCallback(async () => {
    if (phaseRef.current !== 'recording') return
    await triggerStop('user_stop')
  }, [triggerStop])

  const start = useCallback(async () => {
    if (selectedModules.length === 0) {
      setError('Selecciona al menos un módulo')
      return
    }
    setError(null)
    setEvaluation(null)
    setLiveScore(null)
    setStopReason(null)
    setEmotionTriggerLabel(null)
    setRecordingAudioUrl(null)
    setRecordingDurationMs(0)
    setCalibrationProgress(0)
    isStoppingRef.current = false
    stopReasonRef.current = null
    inFlightFramesRef.current = 0
    evaluatedSoFarSecondsRef.current = 0
    frameAbortRef.current = new AbortController()
    strikes.reset()
    emotionStop.reset()

    // Open audio stream and (when facial is active) request the camera.
    let audioStream: MediaStream
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : 'No se pudo acceder al micrófono')
      return
    }
    audioStreamRef.current = audioStream
    setActiveStream(audioStream)

    // Build audio graph shared between calibrator and pause detector.
    const audioCtx = new AudioContext()
    audioContextRef.current = audioCtx
    const source = audioCtx.createMediaStreamSource(audioStream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    analyserRef.current = analyser

    // Open session row in BD so we have an id to attach frames to.
    let openResponse
    try {
      openResponse = await HttpLiveSessionRepository.startSession()
    } catch (exc) {
      setError(
        exc instanceof ApiError ? exc.message : 'No se pudo abrir la sesión live',
      )
      releaseStreams()
      await releaseAudioGraph()
      return
    }
    sessionIdRef.current = openResponse.session_id
    startedAtIsoRef.current = openResponse.started_at

    // Lazy-load and start the face loop when facial_expression is
    // tildada. The session id is already open at this point so emotion
    // ticks can start feeding the summary builder without a race.
    //
    // During the 'calibrating' phase the loop emits RAW blendshapes
    // that we accumulate into baselineSumRef to build the user's
    // neutral baseline. After calibration ends we set
    // facialPhaseRef.current = 'live' and from that tick onward the
    // listener classifies with the baseline and feeds the smoother +
    // summary builder.
    if (facialEnabled) {
      facialSummaryBuilderRef.current = new FacialSummaryBuilder()
      facialPhaseRef.current = 'calibrating'
      baselineSumRef.current = new Map()
      baselineCountRef.current = 0
      finalBaselineRef.current = null
      const loop = new LiveFaceLoop()
      try {
        await loop.load()
        await loop.start((blendshapes) => {
          if (facialPhaseRef.current === 'calibrating') {
            for (const sample of blendshapes) {
              baselineSumRef.current.set(
                sample.categoryName,
                (baselineSumRef.current.get(sample.categoryName) ?? 0) + sample.score,
              )
            }
            baselineCountRef.current += 1
            return
          }
          const prediction = loop.classify(blendshapes, finalBaselineRef.current ?? undefined)
          facialSummaryBuilderRef.current?.feed(prediction.emotion)
          emotionStop.feedPrediction(prediction.emotion, prediction.confidence)
        })
      } catch (exc) {
        loop.stop()
        setError(
          exc instanceof Error ? exc.message : 'No se pudo activar la cámara',
        )
        releaseStreams()
        await releaseAudioGraph()
        return
      }
      faceLoopRef.current = loop
      setVideoStream(loop.getStream())
    }

    setPhase('calibrating')

    // Calibration: short silence window with a UI progress tick. The
    // calibrator and the progress interval run in parallel; the
    // interval ends as soon as the calibrator resolves.
    const calibrationStartedAt = performance.now()
    const calibrationInterval = window.setInterval(() => {
      const elapsed = performance.now() - calibrationStartedAt
      setCalibrationProgress(Math.min(1, elapsed / CALIBRATION_MS))
    }, 50)
    const noiseCalibration = await calibrateNoiseFloor(analyser, {
      durationMs: CALIBRATION_MS,
    })
    window.clearInterval(calibrationInterval)
    setCalibrationProgress(1)

    // Build the facial baseline from blendshapes accumulated during
    // calibration. If for any reason we did not collect any sample
    // (camera failed to deliver frames within the window) we leave the
    // baseline empty: classify() then falls back to absolute scores,
    // which is the same behavior as before this fix and at least lets
    // the session continue.
    if (facialEnabled && baselineCountRef.current > 0) {
      const baseline: BlendshapeBaseline = {}
      for (const [key, sum] of baselineSumRef.current) {
        baseline[key] = sum / baselineCountRef.current
      }
      finalBaselineRef.current = baseline
    }
    facialPhaseRef.current = 'live'

    // Start the full-audio recorder for the final composed evaluation.
    const mime = pickMimeType()
    const mainRecorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : {})
    mainChunksRef.current = []
    mainRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) mainChunksRef.current.push(event.data)
    }
    mainRecorderRef.current = mainRecorder
    mainRecorder.start()

    // Pause detector + frame recorder for the strike pipeline. Frames
    // only matter when at least one audio module is tildada; when only
    // facial is selected we still keep the detector running but no
    // frames will be submitted.
    const pauseDetector = new PauseDetector(analyser, noiseCalibration)
    const frameRecorder = new FrameRecorder(audioStream)
    pauseDetectorRef.current = pauseDetector
    frameRecorderRef.current = frameRecorder

    frameRecorder.start((event) => {
      void submitFrame(event)
    })

    pauseDetector.start({
      onPause: () => {
        frameRecorder.cut('pause')
        pauseDetector.resetFrameTimer()
      },
      onForceCut: () => {
        frameRecorder.cut('force_cut')
        pauseDetector.resetFrameTimer()
      },
    })

    if (facialEnabled) {
      emotionStop.start(performance.now())
    }

    recordingStartedAtMsRef.current = performance.now()
    setElapsedSeconds(0)
    setIsRecording(true)
    setPhase('recording')

    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1
        if (next >= MAX_SESSION_SECONDS) {
          void triggerStop('time_limit')
        }
        return next
      })
    }, 1000)
  }, [
    selectedModules,
    facialEnabled,
    strikes,
    emotionStop,
    submitFrame,
    triggerStop,
    releaseAudioGraph,
    releaseStreams,
  ])

  // Auto-stop watchers. Both watchers gate on the current phase via the
  // ref so a stale render does not trigger spurious stops after the
  // session is already torn down.
  useEffect(() => {
    if (!strikes.shouldStop) return
    if (phaseRef.current !== 'recording') return
    if (isStoppingRef.current) return
    void triggerStop('auto_stop_strikes')
  }, [strikes.shouldStop, triggerStop])

  useEffect(() => {
    if (!emotionStop.trigger) return
    if (phaseRef.current !== 'recording') return
    if (isStoppingRef.current) return
    setEmotionTriggerLabel(EMOTION_LABEL[emotionStop.trigger.emotion] ?? 'malestar')
    setStopReason('auto_stop_emotion')
    // Persist the emotion for the feedback page in a derived field
    if (facialSummaryBuilderRef.current) {
      facialSummaryBuilderRef.current.feed(emotionStop.trigger.emotion)
    }
    void triggerStop('auto_stop_emotion')
  }, [emotionStop.trigger, triggerStop])

  // Tear-down on unmount: stop loops, release resources, and best-
  // effort abandon any still-open session so we do not leak active
  // rows in BD.
  useEffect(() => {
    return () => {
      clearElapsedTimer()
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      pauseDetectorRef.current?.stop()
      void frameRecorderRef.current?.stop()
      faceLoopRef.current?.stop()
      void releaseAudioGraph()
      audioStreamRef.current?.getTracks().forEach((t) => t.stop())
      audioStreamRef.current = null
      const orphan = sessionIdRef.current
      const currentPhase = phaseRef.current
      if (
        orphan &&
        (currentPhase === 'calibrating' ||
          currentPhase === 'recording' ||
          currentPhase === 'evaluating')
      ) {
        void HttpLiveSessionRepository.abandonSession(orphan, 'user_stop').catch(() => {})
      }
      // Avoid duplicate work in callbacks once unmounted.
      sessionIdRef.current = null
    }
  }, [clearElapsedTimer, releaseAudioGraph])

  // Map raw emotion names to the user-facing fragment used by the
  // feedback page. Surface the label only when the auto-stop reason is
  // emotion; clear otherwise.
  useEffect(() => {
    if (stopReason !== 'auto_stop_emotion') {
      setEmotionTriggerLabel(null)
    }
  }, [stopReason])

  // Helper map for callers reading emotion names by raw key — keeps
  // the mapping in one place even though it currently sees no external
  // consumer. The constant is exported via the hook surface for
  // future consumers (e.g., a debug overlay).

  return {
    phase,
    selectedModules,
    elapsedSeconds,
    evaluation,
    liveScore,
    error,
    activeStream,
    videoStream,
    isRecording,
    calibrationProgress,
    strikeEvents: strikes.events,
    stopReason,
    emotionTriggerLabel,
    recordingAudioUrl,
    recordingDurationMs,
    toggleModule,
    start,
    stop,
    reset,
  }
}

// Re-export the per-emotion label map so feedback UI can render the
// emotion that triggered an auto_stop_emotion in user-facing Spanish.
export { EMOTION_LABEL, RAW_TO_FACIAL }
