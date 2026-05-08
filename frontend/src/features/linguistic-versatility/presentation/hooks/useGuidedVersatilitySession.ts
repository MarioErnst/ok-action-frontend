import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRecorder } from '../../services/audioRecorder'
import { HttpLinguisticVersatilityRepository } from '../../infrastructure/HttpLinguisticVersatilityRepository'
import type {
  EvaluateRoundResponse,
  GuidedStatus,
  SessionDetail,
  VersatilityQuestion,
} from '../../domain/LinguisticVersatility'

/**
 * Orchestrates a guided session: idle → recording → uploading → review →
 * (next question or finalize) → results.
 *
 * Holds the recorder and the buffered round results in refs so synchronous
 * double-clicks on Iniciar/Detener can't fire the same transition twice.
 */
export function useGuidedVersatilitySession() {
  const [status, setStatus] = useState<GuidedStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<VersatilityQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastResult, setLastResult] = useState<EvaluateRoundResponse | null>(null)
  const [finalResult, setFinalResult] = useState<SessionDetail | null>(null)

  // Refs for things that must mutate synchronously inside callbacks.
  const recorderRef = useRef<AudioRecorder | null>(null)
  const statusRef = useRef<GuidedStatus>('idle')
  statusRef.current = status

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle' && statusRef.current !== 'error') return
    statusRef.current = 'loading'
    setStatus('loading')
    setError(null)
    setLastResult(null)
    setFinalResult(null)
    try {
      const res = await HttpLinguisticVersatilityRepository.startSession()
      setSessionId(res.session_id)
      setQuestions(res.questions)
      setCurrentIndex(0)
      // After loading the first question we land in idle-per-question state,
      // i.e. ready to record. We use 'review' loosely: the user reads the
      // question and decides when to press Record.
      statusRef.current = 'review'
      setStatus('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar la sesión'
      statusRef.current = 'error'
      setError(msg)
      setStatus('error')
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (statusRef.current !== 'review') return
    statusRef.current = 'recording'
    setStatus('recording')
    try {
      recorderRef.current = new AudioRecorder()
      await recorderRef.current.start()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sin acceso al micrófono'
      statusRef.current = 'error'
      setError(msg)
      setStatus('error')
    }
  }, [])

  const stopAndUpload = useCallback(async () => {
    if (statusRef.current !== 'recording') return
    statusRef.current = 'uploading'
    setStatus('uploading')

    const recorder = recorderRef.current
    const sid = sessionId
    const question = questions[currentIndex]
    if (!recorder || !sid || !question) {
      statusRef.current = 'error'
      setError('Estado inválido. Reiniciá la sesión.')
      setStatus('error')
      return
    }

    try {
      const audio = await recorder.stop()
      recorderRef.current = null
      const result = await HttpLinguisticVersatilityRepository.submitRound(
        sid,
        question.id,
        audio,
      )
      setLastResult(result)
      statusRef.current = 'review'
      setStatus('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el audio'
      statusRef.current = 'error'
      setError(msg)
      setStatus('error')
    }
  }, [sessionId, questions, currentIndex])

  const next = useCallback(async () => {
    if (statusRef.current !== 'review') return
    setLastResult(null)
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1)
      // statusRef stays 'review'; the new question takes over.
      return
    }
    // Last question answered — finalize the session.
    if (!sessionId) return
    statusRef.current = 'finalizing'
    setStatus('finalizing')
    try {
      const detail = await HttpLinguisticVersatilityRepository.finalize(sessionId)
      setFinalResult(detail)
      statusRef.current = 'results'
      setStatus('results')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo finalizar la sesión'
      statusRef.current = 'error'
      setError(msg)
      setStatus('error')
    }
  }, [sessionId, currentIndex, questions.length])

  const reset = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
    statusRef.current = 'idle'
    setStatus('idle')
    setError(null)
    setSessionId(null)
    setQuestions([])
    setCurrentIndex(0)
    setLastResult(null)
    setFinalResult(null)
  }, [])

  // On unmount, fire-and-forget abandon if a session is in progress so the
  // backend doesn't hold onto orphaned 'active' rows.
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel()
      const sid = sessionId
      const status = statusRef.current
      if (sid && status !== 'results' && status !== 'idle' && status !== 'error') {
        HttpLinguisticVersatilityRepository.abandon(sid).catch(() => {})
      }
    }
  }, [sessionId])

  return {
    status,
    error,
    questions,
    currentIndex,
    currentQuestion: questions[currentIndex] ?? null,
    lastResult,
    finalResult,
    isLastQuestion: currentIndex + 1 === questions.length,
    start,
    startRecording,
    stopAndUpload,
    next,
    reset,
  }
}
