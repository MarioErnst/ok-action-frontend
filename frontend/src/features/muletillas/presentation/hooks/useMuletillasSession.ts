import { useCallback, useRef, useState } from 'react'
import { toMuletillasEvaluation } from '../../infrastructure/mappers/muletillasMapper'
import { HttpMuletillasRepository } from '../../infrastructure/repositories/HttpMuletillasRepository'
import type { MuletillasEvaluation } from '../../domain/MuletillasSession'
import useAudioRecorder from '../../../../../shared/hooks/useAudioRecorder'

// Fases del flujo de evaluacion: pregunta -> grabando -> evaluando -> resultados
export type MuletillasPhase = 'idle' | 'question' | 'recording' | 'evaluating' | 'results'

export default function useMuletillasSession() {
  const [phase, setPhase] = useState<MuletillasPhase>('idle')
  const [question, setQuestion] = useState<string>('')
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<MuletillasEvaluation | null>(null)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)

  const { isRecording, recordingError, startRecording, stopRecording, releaseResources } =
    useAudioRecorder()

  // Ref para mantener la pregunta disponible durante el ciclo completo de evaluacion
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

      // Guardar la sesion en BD de forma no bloqueante para no retrasar la visualizacion
      HttpMuletillasRepository.saveSession({
        question_text: questionRef.current,
        overall_score: dto.overall_score,
        fluency_score: dto.fluency_score,
        muletillas_score: dto.muletillas_score,
        total_muletillas_count: dto.total_muletillas_count,
        muletillas_per_minute: dto.muletillas_per_minute,
        feedback: dto.feedback,
        strengths: dto.strengths,
        improvement_areas: dto.improvement_areas,
        muletillas_detected: dto.muletillas_detected,
      }).catch((err) => {
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
    evaluationResult,
    evaluationError,
    loadQuestion,
    startRecordingResponse,
    stopAndEvaluate,
    resetSession,
  }
}
