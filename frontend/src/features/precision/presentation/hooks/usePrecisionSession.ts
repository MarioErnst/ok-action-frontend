import { useCallback, useEffect, useRef, useState } from 'react'
import type { PrecisionQuestion } from '../../domain/PrecisionQuestion'
import type { PrecisionRound } from '../../domain/PrecisionRound'
import useAudioRecorder from '../../../../shared/hooks/useAudioRecorder'
import { startPrecisionSession } from '../../use_cases/startPrecisionSession'
import { submitPrecisionAnswer } from '../../use_cases/submitPrecisionAnswer'
import { finalizePrecisionSession } from '../../use_cases/finalizePrecisionSession'
import { abandonPrecisionSession } from '../../use_cases/abandonPrecisionSession'

type Phase =
  | 'IDLE'
  | 'LOADING_SESSION'
  | 'ASKING'
  | 'RECORDING'
  | 'EVALUATING'
  | 'ROUND_RESULT'
  | 'UNINTELLIGIBLE'
  | 'COMPLETED'
  | 'ERROR'
  | 'ABANDONED'

interface PrecisionSessionState {
  phase: Phase
  sessionId: string | null
  questions: PrecisionQuestion[]
  currentQuestionIndex: number
  rounds: PrecisionRound[]
  overallScore: number | null
  errorMessage: string | null
  noiseLevel: 'low' | 'medium' | 'high'
  elapsedSeconds: number
}

export function usePrecisionSession() {
  const [state, setState] = useState<PrecisionSessionState>({
    phase: 'IDLE',
    sessionId: null,
    questions: [],
    currentQuestionIndex: 0,
    rounds: [],
    overallScore: null,
    errorMessage: null,
    noiseLevel: 'low',
    elapsedSeconds: 0,
  })

  // useAudioRecorder is a default export; startRecording and stopRecording are async
  const { isRecording, startRecording, stopRecording, releaseResources } = useAudioRecorder()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPhaseRef = useRef<Phase>('IDLE')
  // Tracks latest sessionId and phase so the unmount cleanup reads current values, not stale closure values from mount time.
  const sessionStateRef = useRef({ sessionId: state.sessionId, phase: state.phase })
  // Tracks latest elapsedSeconds so stopAndEvaluate never reads a stale value from its closure.
  const elapsedRef = useRef(0)

  // Keep sessionStateRef current on every render so the unmount cleanup always has fresh values.
  useEffect(() => {
    sessionStateRef.current = { sessionId: state.sessionId, phase: state.phase }
  })

  // Timer for recording elapsed time
  useEffect(() => {
    if (state.phase === 'RECORDING') {
      timerRef.current = setInterval(() => {
        setState(s => {
          const next = s.elapsedSeconds + 1
          elapsedRef.current = next
          return { ...s, elapsedSeconds: next }
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (state.phase !== 'ASKING') {
        elapsedRef.current = 0
        setState(s => ({ ...s, elapsedSeconds: 0 }))
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state.phase])

  // Abandon session on unmount if still active.
  // Reads from sessionStateRef so it always sees the latest sessionId/phase, not the stale closure captured at mount.
  useEffect(() => {
    return () => {
      const { sessionId, phase } = sessionStateRef.current
      if (sessionId && ['ASKING', 'RECORDING', 'EVALUATING', 'ROUND_RESULT', 'UNINTELLIGIBLE'].includes(phase)) {
        abandonPrecisionSession(sessionId).catch(() => {})
        releaseResources()
      }
    }
  }, []) // safe because sessionStateRef is always current

  const startSession = useCallback(async (totalRounds = 5) => {
    setState(s => ({ ...s, phase: 'LOADING_SESSION', errorMessage: null }))
    try {
      const { sessionId, questions } = await startPrecisionSession(totalRounds)
      if (questions.length === 0) {
        setState(s => ({ ...s, phase: 'ERROR', errorMessage: 'No hay preguntas disponibles en este momento.' }))
        return
      }
      setState(s => ({
        ...s,
        phase: 'ASKING',
        sessionId,
        questions,
        currentQuestionIndex: 0,
        rounds: [],
        overallScore: null,
      }))
    } catch (err) {
      prevPhaseRef.current = 'LOADING_SESSION'
      setState(s => ({ ...s, phase: 'ERROR', errorMessage: String(err) }))
    }
  }, [])

  const startRecordingAnswer = useCallback(async () => {
    await startRecording()
    setState(s => ({ ...s, phase: 'RECORDING', elapsedSeconds: 0 }))
  }, [startRecording])

  const stopAndEvaluate = useCallback(async () => {
    // stopRecording returns Promise<Blob> — the resolved value is the audio blob
    const audioBlob = await stopRecording()
    if (!audioBlob || !state.sessionId) return

    const currentQuestion = state.questions[state.currentQuestionIndex]
    setState(s => ({ ...s, phase: 'EVALUATING' }))

    try {
      const round = await submitPrecisionAnswer(
        state.sessionId,
        currentQuestion.id,
        audioBlob,
        state.noiseLevel,
        elapsedRef.current  // use ref, not state — state would be stale
      )
      setState(s => ({
        ...s,
        phase: round.audioIntelligible ? 'ROUND_RESULT' : 'UNINTELLIGIBLE',
        rounds: [...s.rounds, round],
      }))
    } catch (err) {
      prevPhaseRef.current = 'EVALUATING'
      setState(s => ({ ...s, phase: 'ERROR', errorMessage: String(err) }))
    }
  }, [state.sessionId, state.questions, state.currentQuestionIndex, state.noiseLevel, stopRecording])

  const nextQuestion = useCallback(async () => {
    const nextIndex = state.currentQuestionIndex + 1
    if (nextIndex >= state.questions.length) {
      // Finalize session when all questions have been answered
      setState(s => ({ ...s, phase: 'EVALUATING' }))
      try {
        const { overallScore } = await finalizePrecisionSession(state.sessionId!)
        setState(s => ({ ...s, phase: 'COMPLETED', overallScore }))
        releaseResources()
      } catch (err) {
        // The session was never completed, so ROUND_RESULT is the correct previous phase for retry logic.
        prevPhaseRef.current = 'ROUND_RESULT'
        setState(s => ({ ...s, phase: 'ERROR', errorMessage: String(err) }))
      }
    } else {
      setState(s => ({ ...s, phase: 'ASKING', currentQuestionIndex: nextIndex }))
    }
  }, [state.currentQuestionIndex, state.questions.length, state.sessionId, releaseResources])

  const retryRecording = useCallback(async () => {
    await startRecording()
    setState(s => ({ ...s, phase: 'RECORDING', elapsedSeconds: 0 }))
  }, [startRecording])

  const retry = useCallback(() => {
    const fallback = prevPhaseRef.current === 'LOADING_SESSION' ? 'IDLE' : 'ASKING'
    setState(s => ({ ...s, phase: fallback, errorMessage: null }))
  }, [])

  const setNoiseLevel = useCallback((level: 'low' | 'medium' | 'high') => {
    setState(s => ({ ...s, noiseLevel: level }))
  }, [])

  const reset = useCallback(() => {
    releaseResources()
    setState({
      phase: 'IDLE',
      sessionId: null,
      questions: [],
      currentQuestionIndex: 0,
      rounds: [],
      overallScore: null,
      errorMessage: null,
      noiseLevel: 'low',
      elapsedSeconds: 0,
    })
  }, [releaseResources])

  return {
    ...state,
    currentQuestion: state.questions[state.currentQuestionIndex] ?? null,
    isLastRound: state.currentQuestionIndex === state.questions.length - 1,
    isRecording,
    startSession,
    startRecordingAnswer,
    stopAndEvaluate,
    nextQuestion,
    retryRecording,
    retry,
    setNoiseLevel,
    reset,
  }
}
