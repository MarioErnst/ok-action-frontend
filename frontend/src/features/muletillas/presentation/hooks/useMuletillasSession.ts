// Session logic for the muletillas module: documentacion/modulos/muletillas.md
import { useCallback, useRef, useState } from 'react'
import { toMuletillasEvaluation, toSaveMuletillasSessionDto } from '../../infrastructure/mappers/muletillasMapper'
import { HttpMuletillasRepository } from '../../infrastructure/repositories/HttpMuletillasRepository'
import type { MuletillasEvaluation } from '../../domain/MuletillasSession'
import useAudioRecorder from '../../../../shared/hooks/useAudioRecorder'

// Evaluation flow phases: question -> recording -> evaluating -> results
export type MuletillasPhase = 'idle' | 'question' | 'recording' | 'evaluating' | 'results'

export default function useMuletillasSession() {
  const [phase, setPhase] = useState<MuletillasPhase>('idle')
  const [question, setQuestion] = useState<string>('')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<MuletillasEvaluation | null>(null)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)

  const {
    isRecording,
    recordingError,
    activeStream,
    startRecording,
    stopRecording,
    releaseResources,
  } = useAudioRecorder()

  // Ref to keep the question available throughout the full evaluation cycle
  const questionRef = useRef<string>('')

  const loadQuestion = useCallback(async () => {
    setIsLoadingQuestion(true)
    setEvaluationError(null)
    try {
      const dto = await HttpMuletillasRepository.getRandomQuestion()
      setQuestion(dto.question)
      questionRef.current = dto.question
      setPhase('question')
    } catch {
      setEvaluationError('No se pudo cargar la pregunta. Intenta de nuevo.')
    } finally {
      setIsLoadingQuestion(false)
    }
  }, [])

  const startRecordingResponse = useCallback(async () => {
    setEvaluationError(null)
    try {
      await startRecording()
      setPhase('recording')
    } catch {
      setEvaluationError('No se pudo acceder al microfono. Verifica los permisos.')
    }
  }, [startRecording])

  const stopAndEvaluate = useCallback(async () => {
    setPhase('evaluating')
    try {
      const audioBlob = await stopRecording()
      const dto = await HttpMuletillasRepository.evaluateResponse(audioBlob, questionRef.current)
      const evaluation = toMuletillasEvaluation(dto)

      // Save session to DB without blocking to avoid delaying result display.
      // The mapper builds the new uniform-schema payload (timestamps + the
      // metrics wrapper with normalized words); ephemeral Gemini fields like
      // feedback/strengths stay in-memory only.
      HttpMuletillasRepository.saveSession(
        toSaveMuletillasSessionDto(evaluation),
      ).catch((err) => {
        console.error('Error al guardar la sesion de muletillas:', err)
      })

      setEvaluationResult(evaluation)
      setPhase('results')
    } catch {
      setEvaluationError('Ocurrio un error al procesar tu respuesta. Intenta de nuevo.')
      setPhase('question')
    }
  }, [stopRecording])

  const resetSession = useCallback(() => {
    releaseResources()
    setEvaluationResult(null)
    setEvaluationError(null)
    setQuestion('')
    questionRef.current = ''
    setPhase('idle')
  }, [releaseResources])

  return {
    phase,
    question,
    isLoadingQuestion,
    isRecording,
    recordingError,
    activeStream,
    evaluationResult,
    evaluationError,
    loadQuestion,
    startRecordingResponse,
    stopAndEvaluate,
    resetSession,
  }
}
