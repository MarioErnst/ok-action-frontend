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

      baselineRef.current = {
        pucker: avg('pucker'),
        brow_down: avg('brow_down'),
        lips_down: avg('lips_down'),
      }

      setPhase('question')
    }
  }, [])

  // Called every frame by useFaceDetector during a question recording.
  const onRecordingFrame = useCallback(
    (bs: LiveBlendshapes) => {
      const t = Date.now() - questionStartTimeRef.current
      questionFramesRef.current.push({ t, pk: bs.pucker, bd: bs.brow_down, ld: bs.lips_down })
    },
    []
  )

  function startCalibration() {
    baselineFramesRef.current = []
    calibrationStartRef.current = Date.now()
    setCalibrationProgress(0)
    setPhase('calibration')
  }

  function startQuestion() {
    questionFramesRef.current = []
    questionStartTimeRef.current = Date.now()
    setPhase('recording')
  }

  function finishQuestion() {
    const duration = Date.now() - questionStartTimeRef.current
    questionPayloadsRef.current.push({
      question_id: currentQuestion.id,
      question_text: currentQuestion.text,
      duration_ms: duration,
      frames: [...questionFramesRef.current],
    })

    const next = questionIndex + 1
    if (next < FACIAL_EXPRESSION_QUESTIONS.length) {
      setQuestionIndex(next)
      setPhase('question')
    } else {
      submitSession()
    }
  }

  async function submitSession() {
    if (!baselineRef.current) return
    setPhase('submitting')

    try {
      const sessionResult = await HttpFacialExpressionRepository.saveSession({
        baseline: baselineRef.current,
        questions: questionPayloadsRef.current,
      })
      setResult(sessionResult)
      setPhase('results')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      setPhase('error')
    }
  }

  function reset() {
    setPhase('loading')
    setQuestionIndex(0)
    setCalibrationProgress(0)
    setResult(null)
    setError(null)
    baselineFramesRef.current = []
    baselineRef.current = null
    questionFramesRef.current = []
    questionPayloadsRef.current = []
  }

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
