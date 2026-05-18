import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ApiError } from '../../../../api/client'
import useVoiceMonitor from '../../../../shared/hooks/useVoiceMonitor'
import type { LoudnessConfig } from '../../../loudness/domain/LoudnessSession'
import type { LoudnessPresetDto } from '../../../loudness/infrastructure/dto/LoudnessDtos'
import type { CalibrationStep } from '../components/organisms/CalibrationScreen'
import { useElapsedTimer } from './useElapsedTimer'
import { useFacialBaseline } from './useFacialBaseline'
import { useLiveAutoStops } from './useLiveAutoStops'
import { useLiveLoudness, type LoudnessStopReason } from './useLiveLoudness'
import { useLivePhonation, type PhonationStopReason } from './useLivePhonation'
import { useLoudnessPresets } from './useLoudnessPresets'
import { useVoiceBaseline } from './useVoiceBaseline'
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
import { LiveAudioStreamer, buildSilencePcm } from '../../services/liveStreaming/audioStreamer'
import { LiveStreamSocket } from '../../services/liveStreaming/liveStreamSocket'
import { FacialSummaryBuilder } from '../../services/emotionMonitor/facialSummaryBuilder'
import { LiveFaceLoop } from '../../services/emotionMonitor/liveFaceLoop'
import { useLiveStreamingStrikes } from './useLiveStreamingStrikes'
import { useEmotionStop } from './useEmotionStop'

const MAX_SESSION_SECONDS = 300
const CALIBRATION_MS = 2000
const STOPPED_TRANSITION_MS = 5000
// Pad of digital silence pushed through the WS right after `ready` to
// warm up the Live model before the user starts speaking. Anything
// between 200-500 ms is enough in practice to skip the first-token
// cold-start spike.
const WARMUP_SILENCE_MS = 300

// The streaming pipeline only forwards muletillas to the backend.
// The other live modules (phonation, loudness, facial_expression)
// run 100% client-side: phonation/loudness through the AudioWorklet
// pitch+dB stream, facial_expression through useEmotionStop.
const LIVE_STREAM_MODULES: ReadonlyArray<LiveStreamModule> = ['muletillas']

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

// Which auto-stop counter actually fired. Used by the
// stopped_transition overlay to render a category-specific copy.
// Pronunciation and accentuation no longer trigger live auto-stops;
// phonation and loudness joined the set in feature/live_phonation_loudness.
export type StopCategory =
  | 'muletillas'
  | 'emotion'
  | 'loudness'
  | 'phonation'

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
  // Visible sub-step of the calibration phase. Used by
  // CalibrationScreen to render the matching copy. Null when no audio
  // module is selected.
  calibrationStep: CalibrationStep | null
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
  // overlay can render a copy that matches the actual cause (the four
  // strike counters are independent and each one has its own message).
  // Null when the session ended manually or by time_limit.
  stopCategory: StopCategory | null
  // Fine-grained reason within the loudness/phonation categories.
  // 'clipping' vs 'too_high' for loudness; 'high_pitch' vs 'breaks'
  // for phonation. Null when neither category fired the corten.
  loudnessStopReason: LoudnessStopReason | null
  phonationStopReason: PhonationStopReason | null
  emotionTriggerLabel: string | null
  recordingAudioUrl: string | null
  recordingDurationMs: number
  toggleModule: (module: LiveModule) => void
  // Loudness presets fetched on mount. Empty array while loading or
  // when the user has none.
  loudnessPresets: LoudnessPresetDto[]
  // Preset id currently selected for the live loudness module. Null
  // while the presets are still loading; defaults to the global
  // preset once fetched.
  selectedLoudnessPresetId: string | null
  selectLoudnessPreset: (presetId: string) => void
  // Live-state surfaced from the new client-side hooks so the
  // recording screen can render the meters without re-importing them.
  phonationEnabled: boolean
  loudnessEnabled: boolean
  phonationCurrentHz: number | null
  phonationBreaksInWindow: number
  loudnessCurrentBand: ReturnType<typeof useLiveLoudness>['currentBand']
  loudnessOutOfRangeStreakMs: number
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
  const [evaluation, setEvaluation] = useState<ComposedEvaluation | null>(null)
  const [liveScore, setLiveScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  // Visible sub-step inside the 'calibrating' phase. Null when no
  // audio module is selected (the facial-only flow uses the legacy
  // copy in CalibrationScreen).
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep | null>(
    null,
  )
  const [stopReason, setStopReason] = useState<StopReason | null>(null)
  const [emotionTriggerLabel, setEmotionTriggerLabel] = useState<string | null>(null)
  const [stopCategory, setStopCategory] = useState<StopCategory | null>(null)
  const [loudnessStopReason, setLoudnessStopReason] =
    useState<LoudnessStopReason | null>(null)
  const [phonationStopReason, setPhonationStopReason] =
    useState<PhonationStopReason | null>(null)
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string | null>(null)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const {
    presets: loudnessPresets,
    selectedId: selectedLoudnessPresetId,
    select: selectLoudnessPreset,
  } = useLoudnessPresets()

  const facialEnabled = selectedModules.includes('facial_expression')
  const phonationEnabled = selectedModules.includes('phonation')
  const loudnessEnabled = selectedModules.includes('loudness')
  // The voice monitor stays up when either client-side audio module is
  // active. start() reads this to decide whether to plug the monitor
  // into the shared MediaStream.
  const voiceMeterEnabled = phonationEnabled || loudnessEnabled

  const strikes = useLiveStreamingStrikes()
  const emotionStop = useEmotionStop({ enabled: facialEnabled })

  // The voice monitor consumes the MediaStream we already opened for
  // muletillas streaming. We pass the stream explicitly to its start()
  // method so there is no prop-vs-imperative race. The monitor's noise
  // floor is captured into local state so the loudness classifier
  // (which depends on it) can react when calibration completes.
  const [voiceNoiseFloor, setVoiceNoiseFloor] = useState<number | null>(null)
  const voiceStreamRef = useRef<MediaStream | null>(null)
  // Resolver pair the mic_noise step awaits so it does not advance to
  // voice_baseline until the voice monitor's own ~3 s calibration is
  // done. Without this gate the orchestrator could enter voice_baseline
  // while the monitor is still in its calibration window and never see
  // any voiced frame.
  const noiseFloorReadyResolverRef = useRef<(() => void) | null>(null)
  const handleNoiseFloorReady = useCallback((value: number) => {
    setVoiceNoiseFloor(value)
    noiseFloorReadyResolverRef.current?.()
    noiseFloorReadyResolverRef.current = null
  }, [])
  const voiceMonitor = useVoiceMonitor({
    onNoiseFloorReady: handleNoiseFloorReady,
  })

  // The voice-baseline step is the only window where we sample the
  // user's typical Hz AND dB. After the step closes the captured values
  // stay frozen for the rest of the session: useLivePhonation reads the
  // Hz to detect strained voice; the loudness config below reads the dB
  // to align the preset band thresholds with the user's actual speaking
  // volume instead of an assumed +25 dB over the noise floor.
  const voiceBaseline = useVoiceBaseline({
    frames: voiceMonitor.frames,
    capturing: calibrationStep === 'voice_baseline',
  })

  // Loudness config used by the live classifier. We anchor the preset
  // band offsets to the user's measured speaking dB when available;
  // when the voice-baseline step did not produce a usable estimate
  // (skipped, no voiced frames) we fall back to a conservative noise
  // floor + 25 dB, which is the rough average for normal speech at
  // arm's length.
  const loudnessConfig: LoudnessConfig | null = useMemo(() => {
    if (!loudnessEnabled || voiceNoiseFloor === null) return null
    const preset = loudnessPresets.find(
      (p) => p.id === selectedLoudnessPresetId,
    ) ?? loudnessPresets[0]
    if (!preset) return null
    const measuredBaseline = voiceBaseline.baselineDb
    const fallbackBaseline = voiceNoiseFloor + 25
    const voiceBaselineDb = measuredBaseline ?? fallbackBaseline
    const config: LoudnessConfig = {
      presetId: preset.id,
      label: preset.label,
      description: preset.description ?? '',
      silenceOffsetDb: preset.silence_offset_db,
      tooLowCeilingDbfs: voiceBaselineDb + preset.low_offset_db,
      optimalCeilingDbfs: voiceBaselineDb + preset.optimal_offset_db,
      clipThresholdDbfs: preset.clip_threshold_db,
    }
    console.info('[live-session] loudness config resolved', {
      preset: preset.label,
      baselineSource: measuredBaseline !== null ? 'measured' : 'fallback',
      voiceBaselineDb: Math.round(voiceBaselineDb * 10) / 10,
      tooLowCeilingDbfs: Math.round(config.tooLowCeilingDbfs * 10) / 10,
      optimalCeilingDbfs: Math.round(config.optimalCeilingDbfs * 10) / 10,
      clipThresholdDbfs: Math.round(config.clipThresholdDbfs * 10) / 10,
    })
    return config
  }, [
    loudnessEnabled,
    voiceNoiseFloor,
    voiceBaseline.baselineDb,
    loudnessPresets,
    selectedLoudnessPresetId,
  ])

  const livePhonation = useLivePhonation({
    frames: voiceMonitor.frames,
    enabled: phonationEnabled,
    baselineHz: voiceBaseline.baselineHz,
  })
  const liveLoudness = useLiveLoudness({
    frames: voiceMonitor.frames,
    noiseFloor: voiceNoiseFloor ?? voiceMonitor.noiseFloor,
    config: loudnessConfig,
    enabled: loudnessEnabled,
  })

  // Refs let the auto-stop callbacks read the freshest hook state
  // without depending on it (which would re-create the callback on
  // every reactive change and re-trigger useLiveAutoStops). They are
  // updated by lightweight effects so the callbacks see the latest
  // values without needing them in their dep arrays.
  const livePhonationStopReasonRef = useRef<PhonationStopReason | null>(null)
  const liveLoudnessStopReasonRef = useRef<LoudnessStopReason | null>(null)
  const livePhonationRef = useRef(livePhonation)
  const liveLoudnessRef = useRef(liveLoudness)
  const voiceBaselineRef = useRef(voiceBaseline)
  useEffect(() => {
    livePhonationStopReasonRef.current = livePhonation.stopReason
    livePhonationRef.current = livePhonation
  }, [livePhonation])
  useEffect(() => {
    liveLoudnessStopReasonRef.current = liveLoudness.stopReason
    liveLoudnessRef.current = liveLoudness
  }, [liveLoudness])
  useEffect(() => {
    voiceBaselineRef.current = voiceBaseline
  }, [voiceBaseline])

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
  // Facial baseline lifecycle (accumulation + finalize + reset) is
  // owned by a dedicated hook so the orchestrator only deals with
  // calibration timing and the face-loop listener.
  const facialBaseline = useFacialBaseline()

  // Elapsed-seconds counter with a one-shot time-limit trigger. The
  // limit callback dispatches through a ref so we can declare the
  // timer before the triggerStop closure exists in scope (avoids a
  // temporal dead zone reference).
  const triggerStopRef = useRef<((reason: StopReason) => Promise<void>) | null>(
    null,
  )
  const elapsedTimer = useElapsedTimer({
    limitSeconds: MAX_SESSION_SECONDS,
    onLimit: useCallback(() => {
      void triggerStopRef.current?.('time_limit')
    }, []),
  })

  // Keep refs in sync with state so closures can read fresh values.
  useEffect(() => {
    selectedModulesRef.current = selectedModules
  }, [selectedModules])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

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
    elapsedTimer.reset()
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
    facialBaseline.reset()
    voiceBaseline.reset()

    setSelectedModules([])
    setEvaluation(null)
    setLiveScore(null)
    setError(null)
    setIsRecording(false)
    setCalibrationProgress(0)
    setStopReason(null)
    setStopCategory(null)
    setLoudnessStopReason(null)
    setPhonationStopReason(null)
    setEmotionTriggerLabel(null)
    setRecordingAudioUrl(null)
    setRecordingDurationMs(0)
    strikes.reset()
    emotionStop.reset()
    livePhonation.reset()
    liveLoudness.reset()
    setVoiceNoiseFloor(null)
    setCalibrationStep(null)
    setPhase('selection')
  }, [
    elapsedTimer,
    facialBaseline,
    voiceBaseline,
    releaseStreams,
    recordingAudioUrl,
    strikes,
    emotionStop,
    livePhonation,
    liveLoudness,
  ])

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

      const phonationSummary = selectedModulesRef.current.includes('phonation')
        ? livePhonation.summary() ?? undefined
        : undefined

      const loudnessSummary = selectedModulesRef.current.includes('loudness')
        ? liveLoudness.summary() ?? undefined
        : undefined

      try {
        const evalResponse = await HttpLiveSessionRepository.evaluateAudio(sessionId, {
          audio: audioBlob,
          modules: selectedModulesRef.current,
          startedAt: startedAtIso,
          facialSummary,
          phonationSummary,
          loudnessSummary,
        })

        const composed: ComposedEvaluation = { ...evalResponse.evaluation }
        if (facialSummary) {
          composed.facial_expression = buildFacialSection(facialSummary)
        }
        if (phonationSummary) {
          composed.phonation = phonationSummary
        }
        if (loudnessSummary) {
          composed.loudness = loudnessSummary
        }
        setEvaluation(composed)

        const autoStopReason: AutoStopReasonDto | null =
          reason === 'auto_stop_strikes'
            ? 'auto_stop_strikes'
            : reason === 'auto_stop_emotion'
              ? 'auto_stop_emotion'
              : reason === 'auto_stop_loudness'
                ? 'auto_stop_loudness'
                : reason === 'auto_stop_phonation'
                  ? 'auto_stop_phonation'
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

      elapsedTimer.stop()
      // Close the streaming pipeline so the Gemini WS does not keep
      // billing audio after the user stopped.
      await audioStreamerRef.current?.stop()
      audioStreamerRef.current = null
      await liveSocketRef.current?.close()
      liveSocketRef.current = null
      // Stop the shared voice monitor without releasing the mic (the
      // orchestrator owns the stream and releases it via releaseStreams
      // below).
      await voiceMonitor.stop()
      voiceStreamRef.current = null
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

      const isAuto =
        reason === 'auto_stop_strikes' ||
        reason === 'auto_stop_emotion' ||
        reason === 'auto_stop_loudness' ||
        reason === 'auto_stop_phonation'
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
    [elapsedTimer, releaseStreams, stopMainRecorder, runEvaluation, voiceMonitor],
  )

  // Keep the latest triggerStop visible to the elapsed-timer callback,
  // which was created before triggerStop existed in scope.
  useEffect(() => {
    triggerStopRef.current = triggerStop
  }, [triggerStop])

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
    setLoudnessStopReason(null)
    setPhonationStopReason(null)
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
    // AssemblyAI only feeds muletillas. Opening that WS for sessions
    // that did not pick muletillas wastes a paid streaming session and
    // adds latency to start(); skip it entirely when the user did not
    // ask for muletillas.
    const muletillasEnabled = selectedModules.includes('muletillas')

    // Open audio stream first. LiveFaceLoop opens its own camera
    // stream later when facial_expression is active; doing it
    // sequentially keeps the audio path the same as before so a
    // camera permission denial does not interfere with the audio
    // pipeline.
    let audioStream: MediaStream | null = null
    let noiseFloorReadyPromise: Promise<void> | null = null
    if (hasAudioModule) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (exc) {
        setError(exc instanceof Error ? exc.message : 'No se pudo acceder al micrófono')
        return
      }
      audioStreamRef.current = audioStream
      setActiveStream(audioStream)
      // Hand the same stream to the shared voice monitor so phonation /
      // loudness pipelines do not request a second mic prompt. The
      // monitor starts here (still in pre-calibration) so it has time
      // to read its 3 s of silence before we transition to recording.
      if (voiceMeterEnabled) {
        voiceStreamRef.current = audioStream
        // Set up the noise-floor wait gate BEFORE starting the monitor
        // so the resolver is in place when the callback fires.
        noiseFloorReadyPromise = new Promise<void>((resolve) => {
          noiseFloorReadyResolverRef.current = resolve
        })
        // Pass the stream explicitly: reading it from the externalStream
        // prop would race because the assignment above is imperative and
        // does not re-render the hook before start() reads its ref.
        await voiceMonitor.start(audioStream)
      }
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
    // selected. The session id is already open at this point so emotion
    // ticks can start feeding the summary builder without a race.
    //
    // During calibration the listener funnels RAW blendshapes into
    // useFacialBaseline. Once that hook flips to live (after
    // markLive() is called below the calibration window) the listener
    // classifies with the captured baseline and feeds the smoother
    // and summary builder.
    if (facialEnabled) {
      facialSummaryBuilderRef.current = new FacialSummaryBuilder()
      facialBaseline.reset()
      const loop = new LiveFaceLoop()
      try {
        await loop.load()
        await loop.start((blendshapes) => {
          if (!facialBaseline.isLive()) {
            facialBaseline.feedSamples(blendshapes)
            return
          }
          const prediction = loop.classify(
            blendshapes,
            facialBaseline.getBaseline() ?? undefined,
          )
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

    // Pre-warm the live streaming WS in parallel with the calibration
    // window. Opening the WS now and pushing a short silence chunk
    // hides the AssemblyAI session handshake behind the 2 s
    // calibration UI the user is already watching, so the first real
    // chunk after `recording` lands on a warmed socket. Only open the
    // socket when muletillas is selected — AssemblyAI does not feed
    // any other module.
    let preWarmedSocket: LiveStreamSocket | null = null
    let socketReadyPromise: Promise<void> | null = null
    let authToken: string | null = null
    if (muletillasEnabled) {
      authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        setError('Sesión expirada. Volvé a iniciar sesión.')
        releaseStreams()
        return
      }
      const socket = new LiveStreamSocket()
      socket.onStrike((dto) => {
        if (isStoppingRef.current) return
        strikes.registerStrike(strikeFromDto(dto))
      })
      socket.onClose(({ code, reason }) => {
        if (phaseRef.current === 'recording' && !isStoppingRef.current) {
          console.warn('Live socket closed unexpectedly', code, reason)
        }
      })
      preWarmedSocket = socket
      socketReadyPromise = socket
        .open({
          sessionId: openResponse.session_id,
          modules: LIVE_STREAM_MODULES.slice(),
          token: authToken,
        })
        .then(() => {
          socket.sendAudio(buildSilencePcm(WARMUP_SILENCE_MS))
        })
    }

    setPhase('calibrating')
    // First sub-step: noise floor capture. The shared voice monitor is
    // already running its 3 s silence window if phonation or loudness
    // are active; for muletillas-only we just hold the cosmetic
    // CALIBRATION_MS window. Facial baseline runs in parallel.
    setCalibrationStep(hasAudioModule ? 'mic_noise' : null)

    const calibrationStartedAt = performance.now()
    const calibrationInterval = window.setInterval(() => {
      const elapsed = performance.now() - calibrationStartedAt
      const audioProgress = hasAudioModule ? elapsed / CALIBRATION_MS : 1
      const facialProgress = facialEnabled
        ? facialBaseline.getSampleCount() / MIN_FACIAL_BASELINE_SAMPLES
        : 1
      const progress = Math.min(audioProgress, facialProgress)
      setCalibrationProgress(Math.min(1, progress))
    }, 50)

    try {
      // The mic_noise step waits for three things to complete:
      // 1. A cosmetic minimum so the UI does not flash by.
      // 2. The AssemblyAI WS handshake (when muletillas is selected).
      // 3. The voice monitor's own ~3 s noise-floor calibration. Skipping
      //    this third wait was the bug behind the empty voice_baseline
      //    capture: we used to leave mic_noise after 2 s while the
      //    monitor was still in its internal calibration window, so
      //    voice_baseline ran against a stream that produced no frames
      //    yet. We cap the wait at 5 s as a safety net in case the
      //    callback never fires (worklet failure, mic stalled).
      const noiseFloorGate = noiseFloorReadyPromise
        ? Promise.race([
            noiseFloorReadyPromise,
            new Promise<void>((r) => setTimeout(r, 5_000)),
          ])
        : null
      await Promise.all(
        [
          new Promise((resolve) => setTimeout(resolve, CALIBRATION_MS)),
          socketReadyPromise,
          noiseFloorGate,
        ].filter((p): p is Promise<unknown> => p !== null),
      )
    } catch (exc) {
      window.clearInterval(calibrationInterval)
      setError(
        exc instanceof Error ? exc.message : 'No se pudo abrir la conexión en vivo',
      )
      await preWarmedSocket?.close()
      releaseStreams()
      return
    }

    // Second sub-step: run the voice-baseline window whenever loudness
    // OR phonation are on. Loudness uses it for the UX framing of the
    // band thresholds; phonation captures the user's typical Hz so the
    // live high-pitch detector knows what "normal" sounds like for
    // this user. Three seconds is enough to average a stable pitch
    // without dragging the calibration UI.
    if (loudnessEnabled || phonationEnabled) {
      setCalibrationStep('voice_baseline')
      setCalibrationProgress(0.5)
      await new Promise((resolve) => setTimeout(resolve, 3_000))
      // Snapshot the captured baseline as soon as the window closes so
      // the rest of the session has a stable record in the console.
      // Reading directly from the hook (not a ref) is fine here because
      // we are running in the same async start() flow that owns the
      // calibration timing.
      const hz = voiceBaseline.baselineHz
      const db = voiceBaseline.baselineDb
      console.info(
        '[live-session] voice baseline captured',
        {
          hz: hz !== null ? Math.round(hz) : null,
          db: db !== null ? Math.round(db * 10) / 10 : null,
          samples: voiceBaseline.sampleCount,
        },
      )
    }

    setCalibrationStep('finalizing')

    // If facial is active, keep the calibration phase open until we have
    // enough blendshape samples for a reliable baseline. The hard cap
    // ensures we never spin forever if the face loop misbehaves; if the
    // cap fires we accept whatever we collected (or fall back to absolute
    // scoring when samples == 0, same as before this fix).
    if (facialEnabled) {
      const facialDeadline = performance.now() + FACIAL_CALIBRATION_CAP_MS
      while (
        facialBaseline.getSampleCount() < MIN_FACIAL_BASELINE_SAMPLES &&
        performance.now() < facialDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 80))
      }
    }

    window.clearInterval(calibrationInterval)
    setCalibrationProgress(1)

    // Finalize the facial baseline. The hook averages the accumulated
    // samples; when no sample arrived (camera failed to deliver frames
    // before the cap) the baseline stays null and classify() falls back
    // to absolute scores, matching the pre-baseline behavior.
    if (facialEnabled) {
      facialBaseline.markLive()
    }

    // The full-audio MediaRecorder is needed for ANY audio module
    // (muletillas/phonation/loudness all upload the recording to the
    // composed-eval endpoint at session end). When only facial is
    // selected we skip it.
    if (hasAudioModule && audioStream) {
      const mime = pickMimeType()
      const mainRecorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : {})
      mainChunksRef.current = []
      mainRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) mainChunksRef.current.push(event.data)
      }
      mainRecorderRef.current = mainRecorder
      mainRecorder.start()
    }

    // The PCM streaming pipeline only feeds AssemblyAI for muletillas
    // detection. Skip it entirely when muletillas was not selected so
    // we do not spend AssemblyAI minutes nor add the streamer overhead
    // to sessions that only use client-side audio modules.
    if (muletillasEnabled && audioStream && preWarmedSocket) {
      // The WS was opened and warmed during the calibration window. We
      // adopt it into the long-lived ref so triggerStop / reset / the
      // unmount cleanup can close it like any other resource.
      liveSocketRef.current = preWarmedSocket

      // If the streamer fails to come up we still have to roll back the
      // recorder and the already-open WS so nothing leaks.
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

      const streamer = new LiveAudioStreamer()
      audioStreamerRef.current = streamer
      try {
        await streamer.start(audioStream, (chunk) => {
          preWarmedSocket.sendAudio(chunk)
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
    setCalibrationStep(null)
    setIsRecording(true)
    setPhase('recording')

    elapsedTimer.start()
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
    loudnessEnabled,
    voiceMeterEnabled,
    voiceMonitor,
    strikes,
    emotionStop,
    facialBaseline,
    elapsedTimer,
    releaseStreams,
  ])

  // Auto-stop watchers. Each callback gates on the current phase and
  // the in-flight stop ref so a stale render does not trigger spurious
  // stops after the session is already torn down. The four watchers
  // share a single hook to keep the orchestrator focused on lifecycle.
  const onStrikeStop = useCallback(() => {
    if (phaseRef.current !== 'recording' || isStoppingRef.current) return
    // Only muletillas drive the live strike auto-stop. The threshold is
    // 1 — a single muletilla cuts because AssemblyAI returns a verbatim
    // transcript that the backend matched against a fixed dictionary,
    // so every strike is grounded in something the user actually said.
    setStopCategory('muletillas')
    void triggerStop('auto_stop_strikes')
  }, [triggerStop])

  const onEmotionStopFired = useCallback(
    (emotion: RawEmotionName) => {
      if (phaseRef.current !== 'recording' || isStoppingRef.current) return
      setEmotionTriggerLabel(EMOTION_LABEL[emotion] ?? 'malestar')
      setStopReason('auto_stop_emotion')
      setStopCategory('emotion')
      // Persist the emotion for the feedback page in a derived field.
      if (facialSummaryBuilderRef.current) {
        facialSummaryBuilderRef.current.feed(emotion)
      }
      void triggerStop('auto_stop_emotion')
    },
    [triggerStop],
  )

  const onPhonationStop = useCallback(() => {
    if (phaseRef.current !== 'recording' || isStoppingRef.current) return
    const subReason = livePhonationStopReasonRef.current
    const phonationSnapshot = livePhonationRef.current
    const baselineHz = voiceBaselineRef.current.baselineHz
    setStopCategory('phonation')
    setPhonationStopReason(subReason)
    console.info('[live-session] phonation auto-stop', {
      reason: subReason,
      currentHz:
        phonationSnapshot.currentHz !== null
          ? Math.round(phonationSnapshot.currentHz)
          : null,
      baselineHz: baselineHz !== null ? Math.round(baselineHz) : null,
      highPitchStreakMs: phonationSnapshot.highPitchStreakMs,
      breaksInWindow: phonationSnapshot.breaksInWindow,
    })
    void triggerStop('auto_stop_phonation')
  }, [triggerStop])

  const onLoudnessStop = useCallback(() => {
    if (phaseRef.current !== 'recording' || isStoppingRef.current) return
    const subReason = liveLoudnessStopReasonRef.current
    const loudnessSnapshot = liveLoudnessRef.current
    setStopCategory('loudness')
    setLoudnessStopReason(subReason)
    console.info('[live-session] loudness auto-stop', {
      reason: subReason,
      currentBand: loudnessSnapshot.currentBand,
      outOfRangeStreakMs: loudnessSnapshot.outOfRangeStreakMs,
    })
    void triggerStop('auto_stop_loudness')
  }, [triggerStop])

  useLiveAutoStops({
    strikeShouldStop: strikes.shouldStop,
    emotionTrigger: emotionStop.trigger,
    phonationShouldStop: livePhonation.shouldStop,
    loudnessShouldStop: liveLoudness.shouldStop,
    onStrikeStop,
    onEmotionStop: onEmotionStopFired,
    onPhonationStop,
    onLoudnessStop,
  })

  // Tear-down on unmount: stop loops, release resources, and best-
  // effort abandon any still-open session so we do not leak active
  // rows in BD. The elapsed timer cleans itself up via its own
  // unmount effect inside useElapsedTimer.
  useEffect(() => {
    return () => {
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
  }, [])

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
    elapsedSeconds: elapsedTimer.seconds,
    evaluation,
    liveScore,
    error,
    activeStream,
    videoStream,
    isRecording,
    isStarting,
    calibrationProgress,
    calibrationStep,
    audioEnabled,
    facialEnabled,
    strikeEvents: strikes.events,
    stopReason,
    stopCategory,
    loudnessStopReason,
    phonationStopReason,
    emotionTriggerLabel,
    recordingAudioUrl,
    recordingDurationMs,
    loudnessPresets,
    selectedLoudnessPresetId,
    selectLoudnessPreset,
    phonationEnabled,
    loudnessEnabled,
    phonationCurrentHz: livePhonation.currentHz,
    phonationBreaksInWindow: livePhonation.breaksInWindow,
    loudnessCurrentBand: liveLoudness.currentBand,
    loudnessOutOfRangeStreakMs: liveLoudness.outOfRangeStreakMs,
    toggleModule,
    start,
    stop,
    reset,
  }
}

