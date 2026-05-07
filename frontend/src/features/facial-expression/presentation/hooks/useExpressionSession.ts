import { useCallback, useRef, useState } from 'react'
import { FACIAL_EXPRESSION_QUESTIONS } from '../../questions'
import { HttpFacialExpressionRepository } from '../../infrastructure/repositories/HttpFacialExpressionRepository'
import type {
  Baseline,
  BlendshapeFrame,
  LiveBlendshapes,
  QuestionPayload,
  SessionPhase,
  SessionResult,
} from '../../domain/FacialExpression'

// Calibration: capture 5 seconds of neutral face at 15fps = ~75 frames.
const CALIBRATION_FRAMES = 75
const CALIBRATION_DURATION_MS = 5000

export function useExpressionSession() {
  const [phase, setPhase] = useState<SessionPhase>('loading')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const baselineFramesRef = useRef<LiveBlendshapes[]>([])
  const baselineRef = useRef<Baseline | null>(null)
  const questionFramesRef = useRef<BlendshapeFrame[]>([])
  const questionPayloadsRef = useRef<QuestionPayload[]>([])
  const questionStartTimeRef = useRef<number>(0)
  const calibrationStartRef = useRef<number>(0)
  // Stable ref to questionIndex so submitSession doesn't need it as a dep.
  const questionIndexRef = useRef(0)

  const currentQuestion = FACIAL_EXPRESSION_QUESTIONS[questionIndex]

  // Called every frame by useFaceDetector during calibration.
  const onCalibrationFrame = useCallback((bs: LiveBlendshapes) => {
    // Ignore frames that arrive after the baseline is already computed.
    // The phase transition causes a re-render that rewires the effect,
    // but a few extra frames may arrive before that happens.
    if (baselineFramesRef.current.length >= CALIBRATION_FRAMES) return

    baselineFramesRef.current.push({ ...bs })

    const elapsed = Date.now() - calibrationStartRef.current
    const progress = Math.min(elapsed / CALIBRATION_DURATION_MS, 1)
    setCalibrationProgress(progress)

    if (baselineFramesRef.current.length >= CALIBRATION_FRAMES) {
      const frames = baselineFramesRef.current
      const avg = (key: keyof LiveBlendshapes) =>
        frames.reduce((s, f) => s + f[key], 0) / frames.length

      const baseline = {
        pucker: avg('pucker'),
        brow_down: avg('brow_down'),
        lips_down: avg('lips_down'),
      }

      // Reject NaN/Infinity from corrupted detection frames before persisting.
      const valid = Object.values(baseline).every(
        (v) => Number.isFinite(v) && v >= 0 && v <= 1
      )
      if (!valid) {
        setError('La calibración produjo valores inválidos. Intenta de nuevo.')
        setPhase('error')
        return
      }

      baselineRef.current = baseline
      setPhase('question')
    }
  }, [])

  // Called every frame by useFaceDetector during a question recording.
  // refs are stable; no reactive deps needed.
  const onRecordingFrame = useCallback(
    (bs: LiveBlendshapes) => {
      const t = Date.now() - questionStartTimeRef.current
      questionFramesRef.current.push({ t, pk: bs.pucker, bd: bs.brow_down, ld: bs.lips_down })
    },
    []
  )

  // submitSession uses only refs so it needs no reactive deps.
  const submitSession = useCallback(async () => {
    if (!baselineRef.current) {
      // Surface the inconsistent state instead of hanging the UI in 'submitting'.
      setError('La calibración no se completó correctamente. Reinicia la sesión.')
      setPhase('error')
      return
    }
    setPhase('submitting')

    try {
      const sessionResult = await HttpFacialExpressionRepository.saveSession({
        baseline: baselineRef.current,
        questions: questionPayloadsRef.current,
      })
      // setResult before setPhase so the results screen always has data on first render.
      setResult(sessionResult)
      setPhase('results')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      setPhase('error')
    }
  }, [])

  const startCalibration = useCallback(() => {
    // Only valid from the loading phase; double-trigger is a no-op.
    if (phaseRef.current !== 'loading') return
    phaseRef.current = 'calibration'
    baselineFramesRef.current = []
    calibrationStartRef.current = Date.now()
    setCalibrationProgress(0)
    setPhase('calibration')
  }, [])

  // phaseRef mirrors phase so action callbacks (which have stable identities)
  // can guard against being invoked from a stale UI state (double-click, etc).
  const phaseRef = useRef<SessionPhase>('loading')
  phaseRef.current = phase

  const startQuestion = useCallback(() => {
    if (phaseRef.current !== 'question') return
    // Mutate the ref immediately so a synchronous double-click is rejected.
    phaseRef.current = 'recording'
    questionFramesRef.current = []
    questionStartTimeRef.current = Date.now()
    setPhase('recording')
  }, [])

  const finishQuestion = useCallback(() => {
    if (phaseRef.current !== 'recording') return
    // Block re-entry on rapid double-click; actual phase is set below.
    phaseRef.current = 'submitting'
    const idx = questionIndexRef.current
    const q = FACIAL_EXPRESSION_QUESTIONS[idx]
    const duration = Date.now() - questionStartTimeRef.current
    questionPayloadsRef.current.push({
      question_id: q.id,
      question_text: q.text,
      duration_ms: duration,
      frames: [...questionFramesRef.current],
    })

    const next = idx + 1
    if (next < FACIAL_EXPRESSION_QUESTIONS.length) {
      questionIndexRef.current = next
      setQuestionIndex(next)
      setPhase('question')
    } else {
      submitSession()
    }
  }, [submitSession])

  const reset = useCallback(() => {
    setPhase('loading')
    setQuestionIndex(0)
    setCalibrationProgress(0)
    setResult(null)
    setError(null)
    baselineFramesRef.current = []
    baselineRef.current = null
    questionFramesRef.current = []
    questionPayloadsRef.current = []
    questionIndexRef.current = 0
  }, [])

  return {
    phase,
    currentQuestion,
    questionIndex,
    totalQuestions: FACIAL_EXPRESSION_QUESTIONS.length,
    calibrationProgress,
    result,
    error,
    onCalibrationFrame,
    onRecordingFrame,
    startCalibration,
    startQuestion,
    finishQuestion,
    reset,
  }
}
