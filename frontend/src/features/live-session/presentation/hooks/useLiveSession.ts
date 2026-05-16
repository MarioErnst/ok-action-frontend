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
import type { LiveStreamModule } from '../../infrastructure/dto/LiveStreamDtos'
import { strikeFromDto } from '../../domain/StreamingEvent'
import { HttpLiveSessionRepository } from '../../infrastructure/repositories/HttpLiveSessionRepository'
import { LiveAudioStreamer } from '../../services/liveStreaming/audioStreamer'
import { LiveStreamSocket } from '../../services/liveStreaming/liveStreamSocket'
import { FacialSummaryBuilder } from '../../services/emotionMonitor/facialSummaryBuilder'
import { LiveFaceLoop, type BlendshapeBaseline } from '../../services/emotionMonitor/liveFaceLoop'
import { useLiveStreamingStrikes } from './useLiveStreamingStrikes'
import { useEmotionStop } from './useEmotionStop'

const MAX_SESSION_SECONDS = 300
const CALIBRATION_MS = 2000
const STOPPED_TRANSITION_MS = 5000

// The streaming pipeline talks to muletillas, pronunciation and
// accentuation tools. facial_expression stays 100% client-side.
const LIVE_STREAM_MODULES: ReadonlyArray<LiveStreamModule> = [
  'muletillas',
  'pronunciation',
  'accentuation',
]

// Minimum samples required to compute a reliable facial baseline, matched
// to the standalone facial_expression module (`CALIBRATION_SAMPLES = 45`
// in useEmotionTracking). Live previously stopped calibration on the
// audio timer alone, which sometimes yielded only ~15-20 face samples and
// produced a noisy baseline that disabled the auto-stop on sustained
// emotion. We hold the calibration open until both signals are ready, up
// to a hard cap so we never spin forever.
const MIN_FACIAL_BASELINE_SAMPLES = 45
const FACIAL_CALIBRATION_CAP_MS = 10_000

type StopReason = 'user_stop' | 'time_limit' | AutoStopReasonDto

// Which of the four auto-stop counters actually fired. Used by the
// stopped_transition overlay to render a category-specific copy instead
// of a generic message.
export type StopCategory =
  | 'muletillas'
  | 'pronunciation'
  | 'accentuation'
  | 'emotion'

const EMOTION_LABEL: Record<RawEmotionName, string> = {
  happy: 'felicidad',
  sad: 'tristeza',
  angry: 'enojo',
  surprise: 'sorpresa',
  fear: 'miedo',
  disgust: 'disgusto',
  neutral: 'neutralidad',
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
  // True from the moment start() begins until the session has moved
  // past 'calibrating'. The DimensionSelector reads this to disable
  // its CTA so the user does not re-fire start() while permission
  // prompts or the lazy-loaded MediaPipe download are in flight.
  isStarting: boolean
  calibrationProgress: number
  // Whether the current selection includes at least one audio-bearing
  // module (anything other than facial_expression). Exposed so the
  // calibration UI can adapt its copy and audio-only widgets can hide
  // when only facial is active.
  audioEnabled: boolean
  // Whether the current selection includes facial_expression. Exposed
  // alongside audioEnabled to drive the calibration copy.
  facialEnabled: boolean
  strikeEvents: ReturnType<typeof useLiveStreamingStrikes>['events']
  stopReason: StopReason | null
  // Specific category that triggered the auto-stop. Populated by the
  // hook just before transitioning into stopped_transition so the
  // overlay can render a copy that matches the actual cause (the three
  // strike counters are independent and each one has its own message).
  // Null when the session ended manually or by time_limit.
  stopCategory: StopCategory | null
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
  const [stopCategory, setStopCategory] = useState<StopCategory | null>(null)
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string | null>(null)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)
  const [isStarting, setIsStarting] = useState(false)

  const facialEnabled = selectedModules.includes('facial_expression')
  const strikes = useLiveStreamingStrikes()
  const emotionStop = useEmotionStop({ enabled: facialEnabled })

  // Refs for long-lived resources that should not trigger renders.
  const sessionIdRef = useRef<string | null>(null)
  const startedAtIsoRef = useRef<string | null>(null)
  const recordingStartedAtMsRef = useRef(0)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const mainRecorderRef = useRef<MediaRecorder | null>(null)
  const mainChunksRef = useRef<Blob[]>([])
  const audioStreamerRef = useRef<LiveAudioStreamer | null>(null)
  const liveSocketRef = useRef<LiveStreamSocket | null>(null)
  const faceLoopRef = useRef<LiveFaceLoop | null>(null)
  const facialSummaryBuilderRef = useRef<FacialSummaryBuilder | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isStoppingRef = useRef(false)
  // Guard against double-firing start(): the CTA disable flips
  // through state which is async, so a fast double tap can still
  // reach start() twice. The ref gives us a synchronous check that
  // works no matter the render scheduling.
  const isStartingRef = useRef(false)
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
    void audioStreamerRef.current?.stop()
    audioStreamerRef.current = null
    void liveSocketRef.current?.close()
    liveSocketRef.current = null
    faceLoopRef.current?.stop()
    faceLoopRef.current = null
    facialSummaryBuilderRef.current = null
    releaseStreams()
    if (recordingAudioUrl) {
      URL.revokeObjectURL(recordingAudioUrl)
    }

    sessionIdRef.current = null
    startedAtIsoRef.current = null
    recordingStartedAtMsRef.current = 0
    mainChunksRef.current = []
    mainRecorderRef.current = null
    isStoppingRef.current = false
    stopReasonRef.current = null
    facialPhaseRef.current = 'calibrating'
    baselineSumRef.current = new Map()
    baselineCountRef.current = 0
    finalBaselineRef.current = null

    setSelectedModules([])
    setElapsedSeconds(0)
    setEvaluation(null)
    setLiveScore(null)
    setError(null)
    setIsRecording(false)
    setCalibrationProgress(0)
    setStopReason(null)
    setStopCategory(null)
    setEmotionTriggerLabel(null)
    setRecordingAudioUrl(null)
    setRecordingDurationMs(0)
    strikes.reset()
    emotionStop.reset()
    setPhase('selection')
  }, [clearElapsedTimer, releaseStreams, recordingAudioUrl, strikes, emotionStop])

  const toggleModule = useCallback((module: LiveModule) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    )
  }, [])

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
      // Close the streaming pipeline so the Gemini WS does not keep
      // billing audio after the user stopped.
      await audioStreamerRef.current?.stop()
      audioStreamerRef.current = null
      await liveSocketRef.current?.close()
      liveSocketRef.current = null
      faceLoopRef.current?.stop()

      const fullBlob = await stopMainRecorder()
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
    [clearElapsedTimer, releaseStreams, stopMainRecorder, runEvaluation],
  )

  const stop = useCallback(async () => {
    if (phaseRef.current !== 'recording') return
    await triggerStop('user_stop')
  }, [triggerStop])

  const start = useCallback(async () => {
    if (isStartingRef.current) return
    isStartingRef.current = true
    setIsStarting(true)
    try {
    if (selectedModules.length === 0) {
      setError('Selecciona al menos un módulo')
      return
    }
    setError(null)
    setEvaluation(null)
    setLiveScore(null)
    setStopReason(null)
    setStopCategory(null)
    setEmotionTriggerLabel(null)
    setRecordingAudioUrl(null)
    setRecordingDurationMs(0)
    setCalibrationProgress(0)
    isStoppingRef.current = false
    stopReasonRef.current = null
    strikes.reset()
    emotionStop.reset()

    // Decide which side of the pipeline we actually need based on the
    // selected modules. If the user picked only facial_expression we
    // skip the microphone, the streaming WS and the full-audio recorder
    // entirely — none of them produce useful data for that case and
    // asking for mic permission is a hostile UX when there is no audio
    // analysis to do.
    const hasAudioModule = selectedModules.some(
      (m) => m !== 'facial_expression',
    )

    // Open audio stream first. LiveFaceLoop opens its own camera
    // stream later when facial_expression is active; doing it
    // sequentially keeps the audio path the same as before so a
    // camera permission denial does not interfere with the audio
    // pipeline.
    let audioStream: MediaStream | null = null
    if (hasAudioModule) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (exc) {
        setError(exc instanceof Error ? exc.message : 'No se pudo acceder al micrófono')
        return
      }
      audioStreamRef.current = audioStream
      setActiveStream(audioStream)
    }

    // Open session row in BD so we have an id to attach frames to.
    let openResponse
    try {
      openResponse = await HttpLiveSessionRepository.startSession()
    } catch (exc) {
      setError(
        exc instanceof ApiError ? exc.message : 'No se pudo abrir la sesión live',
      )
      releaseStreams()
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
          return
      }
      faceLoopRef.current = loop
      setVideoStream(loop.getStream())
    }

    setPhase('calibrating')

    // Calibration: a short cosmetic window so the user sees the same
    // "preparing" UI as before, plus, when facial is on, an accumulator
    // for the emotion classifier baseline. The streaming pipeline does
    // not need noise calibration because Gemini Live has its own VAD,
    // but we keep the visible window to match the established UX. We
    // wait for the union of the two signals before transitioning to
    // recording.
    const calibrationStartedAt = performance.now()
    const calibrationInterval = window.setInterval(() => {
      const elapsed = performance.now() - calibrationStartedAt
      const audioProgress = hasAudioModule ? elapsed / CALIBRATION_MS : 1
      const facialProgress = facialEnabled
        ? baselineCountRef.current / MIN_FACIAL_BASELINE_SAMPLES
        : 1
      const progress = Math.min(audioProgress, facialProgress)
      setCalibrationProgress(Math.min(1, progress))
    }, 50)

    await new Promise((resolve) => setTimeout(resolve, CALIBRATION_MS))

    // If facial is active, keep the calibration phase open until we have
    // enough blendshape samples for a reliable baseline. The hard cap
    // ensures we never spin forever if the face loop misbehaves; if the
    // cap fires we accept whatever we collected (or fall back to absolute
    // scoring when samples == 0, same as before this fix).
    if (facialEnabled) {
      const facialDeadline = performance.now() + FACIAL_CALIBRATION_CAP_MS
      while (
        baselineCountRef.current < MIN_FACIAL_BASELINE_SAMPLES &&
        performance.now() < facialDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 80))
      }
    }

    window.clearInterval(calibrationInterval)
    setCalibrationProgress(1)

    // Build the facial baseline from blendshapes accumulated during
    // calibration. If for any reason we did not collect any sample
    // (camera failed to deliver frames within the cap) we leave the
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

    // Audio-only artifacts are created only when we have at least one
    // audio module selected. When only facial is selected we skip the
    // main recorder and the streaming pipeline entirely; the strike
    // counter for facial is driven by the emotion classifier.
    if (hasAudioModule && audioStream) {
      // Start the full-audio recorder for the final composed evaluation.
      // This is the same recording that gets uploaded at session end so
      // the composed eval can score the entire session.
      const mime = pickMimeType()
      const mainRecorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : {})
      mainChunksRef.current = []
      mainRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) mainChunksRef.current.push(event.data)
      }
      mainRecorderRef.current = mainRecorder
      mainRecorder.start()

      // If anything below fails we have to roll back what we already
      // started — the recorder, the WS, the streamer — so an early
      // return does not leave the page with running resources.
      const abortAudioPipeline = async () => {
        if (mainRecorderRef.current && mainRecorderRef.current.state !== 'inactive') {
          try {
            mainRecorderRef.current.stop()
          } catch {
            // already stopped
          }
        }
        mainRecorderRef.current = null
        mainChunksRef.current = []
        if (audioStreamerRef.current) {
          await audioStreamerRef.current.stop()
          audioStreamerRef.current = null
        }
        if (liveSocketRef.current) {
          await liveSocketRef.current.close()
          liveSocketRef.current = null
        }
        releaseStreams()
      }

      // Open the WS to the backend supervisor (which talks to Gemini
      // Live) and the PCM streamer that pumps audio into it.
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('Sesión expirada. Volvé a iniciar sesión.')
        await abortAudioPipeline()
        return
      }
      const socket = new LiveStreamSocket()
      socket.onStrike((dto) => {
        if (isStoppingRef.current) return
        strikes.registerStrike(strikeFromDto(dto))
      })
      socket.onClose(({ code, reason }) => {
        // Only treat as an error if the close happened mid-recording
        // and the user did not already stop. A user-initiated stop
        // closes the socket as part of the teardown path.
        if (phaseRef.current === 'recording' && !isStoppingRef.current) {
          console.warn('Live socket closed unexpectedly', code, reason)
        }
      })
      try {
        await socket.open({
          sessionId: openResponse.session_id,
          modules: LIVE_STREAM_MODULES.slice(),
          token,
        })
      } catch (exc) {
        setError(
          exc instanceof Error ? exc.message : 'No se pudo abrir la conexión en vivo',
        )
        await abortAudioPipeline()
        return
      }
      liveSocketRef.current = socket

      const streamer = new LiveAudioStreamer()
      audioStreamerRef.current = streamer
      try {
        await streamer.start(audioStream, (chunk) => {
          socket.sendAudio(chunk)
        })
      } catch (exc) {
        setError(
          exc instanceof Error ? exc.message : 'No se pudo iniciar el streaming de audio',
        )
        await abortAudioPipeline()
        return
      }
    }

    if (facialEnabled) {
      emotionStop.start(performance.now())
    }

    recordingStartedAtMsRef.current = performance.now()
    // The strikes hook anchors timestamps to wall-clock time because the
    // supervisor sends received_at_ms as an epoch millisecond. We hand
    // it Date.now() at the recording start so per-event timestamps come
    // out relative to the audio file the user will eventually replay.
    strikes.markRecordingStart(Date.now())
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
    } finally {
      // Clear the "preparando" guard regardless of how we got out. If
      // start() reached the recording phase the user has long stopped
      // looking at the CTA; if it failed early, releasing the guard
      // lets the user retry.
      isStartingRef.current = false
      setIsStarting(false)
    }
  }, [
    selectedModules,
    facialEnabled,
    strikes,
    emotionStop,
    triggerStop,
    releaseStreams,
  ])

  // Auto-stop watchers. Both watchers gate on the current phase via the
  // ref so a stale render does not trigger spurious stops after the
  // session is already torn down.
  useEffect(() => {
    if (!strikes.shouldStop) return
    if (phaseRef.current !== 'recording') return
    if (isStoppingRef.current) return
    // The three strike counters are independent so the one that
    // tripped the threshold first is the cause. We capture it here so
    // the stopped_transition overlay can render a category-specific
    // copy. Order checked muletillas → pronunciation → accentuation
    // is arbitrary but stable: if two counters reach the threshold in
    // the same render, the first listed wins. With the streaming
    // pipeline the threshold is 1 — a single valid tool call cuts.
    if (strikes.muletillaCount >= 1) {
      setStopCategory('muletillas')
    } else if (strikes.pronunciationErrorCount >= 1) {
      setStopCategory('pronunciation')
    } else if (strikes.accentuationErrorCount >= 1) {
      setStopCategory('accentuation')
    }
    void triggerStop('auto_stop_strikes')
  }, [
    strikes.shouldStop,
    strikes.muletillaCount,
    strikes.pronunciationErrorCount,
    strikes.accentuationErrorCount,
    triggerStop,
  ])

  useEffect(() => {
    if (!emotionStop.trigger) return
    if (phaseRef.current !== 'recording') return
    if (isStoppingRef.current) return
    setEmotionTriggerLabel(EMOTION_LABEL[emotionStop.trigger.emotion] ?? 'malestar')
    setStopReason('auto_stop_emotion')
    setStopCategory('emotion')
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
      void audioStreamerRef.current?.stop()
      void liveSocketRef.current?.close()
      faceLoopRef.current?.stop()
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
  }, [clearElapsedTimer])

  // Map raw emotion names to the user-facing fragment used by the
  // feedback page. Surface the label only when the auto-stop reason is
  // emotion; clear otherwise.
  useEffect(() => {
    if (stopReason !== 'auto_stop_emotion') {
      setEmotionTriggerLabel(null)
    }
  }, [stopReason])

  // Derived flag exposed for the CalibrationScreen and audio-only
  // widgets. Computed at render time so it reflects the latest
  // selectedModules without an extra effect.
  const audioEnabled = selectedModules.some((m) => m !== 'facial_expression')

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
    isStarting,
    calibrationProgress,
    audioEnabled,
    facialEnabled,
    strikeEvents: strikes.events,
    stopReason,
    stopCategory,
    emotionTriggerLabel,
    recordingAudioUrl,
    recordingDurationMs,
    toggleModule,
    start,
    stop,
    reset,
  }
}

