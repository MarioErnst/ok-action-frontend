import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE_URL } from '../../../../api/client'
import { AudioCapture } from '../../../live-session/services/audioCapture'
import type {
  FluencyAnalysis,
  FluencyPhase,
  FluencyWarningReason,
} from '../../domain/FluencySession'
import { FLUENCY_PROMPTS, getNextFluencyPrompt } from '../../services/questions'

export function useFluencySession() {
  const [phase, setPhase] = useState<FluencyPhase>('idle')
  const [promptText, setPromptText] = useState(FLUENCY_PROMPTS[0])
  const [analyses, setAnalyses] = useState<FluencyAnalysis[]>([])
  const [latestAnalysis, setLatestAnalysis] = useState<FluencyAnalysis | null>(null)
  const [warningReason, setWarningReason] = useState<FluencyWarningReason | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [averageScore, setAverageScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<AudioCapture | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopCapture = useCallback(() => {
    captureRef.current?.stop()
    captureRef.current = null
    clearTimer()
  }, [clearTimer])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      stopCapture()
    }
  }, [stopCapture])

  const nextPrompt = useCallback(() => {
    setPromptText((current) => getNextFluencyPrompt(current))
  }, [])

  const startSession = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('Debes iniciar sesion para practicar fluidez.')
      return
    }

    setPhase('connecting')
    setAnalyses([])
    setLatestAnalysis(null)
    setWarningReason(null)
    setAverageScore(null)
    setElapsedSeconds(0)
    setError(null)

    const ws = new WebSocket(`${WS_BASE_URL}/fluency/session?token=${token}`)
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', prompt_text: promptText }))
    }

    ws.onmessage = async (event) => {
      if (typeof event.data !== 'string') return
      const message = JSON.parse(event.data) as {
        type: string
        data?: FluencyAnalysis
        reason?: FluencyWarningReason
        average_score?: number | null
      }

      if (message.type === 'ready') {
        setPhase('recording')
        timerRef.current = setInterval(() => {
          setElapsedSeconds((seconds) => seconds + 1)
        }, 1000)

        try {
          captureRef.current = new AudioCapture()
          await captureRef.current.start((chunk) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(chunk)
            }
          })
        } catch {
          setError('No se pudo acceder al microfono.')
          ws.close()
          stopCapture()
          setPhase('idle')
        }
      }

      if (message.type === 'analysis' && message.data) {
        setLatestAnalysis(message.data)
        setAnalyses((previous) => [...previous, message.data as FluencyAnalysis])
      }

      if (message.type === 'warning') {
        setWarningReason(message.reason ?? null)
      }

      if (message.type === 'session_ended') {
        stopCapture()
        setAverageScore(message.average_score ?? null)
        setPhase('ended')
      }
    }

    ws.onerror = () => {
      setError('No se pudo conectar la sesion de fluidez.')
      stopCapture()
      setPhase('idle')
    }

    ws.onclose = (event) => {
      wsRef.current = null
      stopCapture()
      if (event.code === 4001) {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_token')
        window.location.href = '/auth'
        return
      }
      setPhase((current) => (current === 'connecting' || current === 'recording' ? 'idle' : current))
    }
  }, [promptText, stopCapture])

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }))
      stopCapture()
      setPhase('ended')
      return
    }
    wsRef.current?.close()
    stopCapture()
    setPhase('ended')
  }, [stopCapture])

  const resetSession = useCallback(() => {
    wsRef.current?.close()
    stopCapture()
    setPhase('idle')
    setAnalyses([])
    setLatestAnalysis(null)
    setWarningReason(null)
    setAverageScore(null)
    setElapsedSeconds(0)
    setError(null)
  }, [stopCapture])

  return {
    phase,
    promptText,
    analyses,
    latestAnalysis,
    warningReason,
    elapsedSeconds,
    averageScore,
    error,
    nextPrompt,
    startSession,
    endSession,
    resetSession,
  }
}
