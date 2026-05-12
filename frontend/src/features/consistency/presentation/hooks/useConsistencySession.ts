import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE_URL } from '../../../../api/client'
import { AudioCapture } from '../../../../shared/services/audioCapture'
import type {
  ConsistencyAnalysis,
  ConsistencyPhase,
  ConsistencyWarningReason,
} from '../../domain/ConsistencySession'
import { CONSISTENCY_PROMPTS, getNextConsistencyPrompt } from '../../services/questions'

export function useConsistencySession() {
  const [phase, setPhase] = useState<ConsistencyPhase>('idle')
  const [promptText, setPromptText] = useState(CONSISTENCY_PROMPTS[0])
  const [analysis, setAnalysis] = useState<ConsistencyAnalysis | null>(null)
  const [warningReason, setWarningReason] = useState<ConsistencyWarningReason | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)
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
    setPromptText((current) => getNextConsistencyPrompt(current))
  }, [])

  const startSession = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('Debes iniciar sesion para practicar consistencia.')
      return
    }

    setPhase('connecting')
    setAnalysis(null)
    setWarningReason(null)
    setFinalScore(null)
    setElapsedSeconds(0)
    setError(null)

    const ws = new WebSocket(`${WS_BASE_URL}/consistency/session?token=${token}`)
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', prompt_text: promptText }))
    }

    ws.onmessage = async (event) => {
      if (typeof event.data !== 'string') return
      const message = JSON.parse(event.data) as {
        type: string
        data?: ConsistencyAnalysis
        reason?: ConsistencyWarningReason
        score?: number | null
        message?: string
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
        setAnalysis(message.data)
      }

      if (message.type === 'warning') {
        setWarningReason(message.reason ?? null)
      }

      if (message.type === 'error') {
        setError(message.message ?? 'No se pudo analizar la consistencia.')
        stopCapture()
        setPhase('idle')
      }

      if (message.type === 'session_ended') {
        stopCapture()
        setFinalScore(message.score ?? null)
        setPhase('ended')
      }
    }

    ws.onerror = () => {
      setError('No se pudo conectar la sesion de consistencia.')
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
      setPhase((current) =>
        current === 'connecting' || current === 'recording' || current === 'analyzing'
          ? 'idle'
          : current,
      )
    }
  }, [promptText, stopCapture])

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }))
      stopCapture()
      setPhase('analyzing')
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
    setAnalysis(null)
    setWarningReason(null)
    setFinalScore(null)
    setElapsedSeconds(0)
    setError(null)
  }, [stopCapture])

  return {
    phase,
    promptText,
    analysis,
    warningReason,
    elapsedSeconds,
    finalScore,
    error,
    nextPrompt,
    startSession,
    endSession,
    resetSession,
  }
}
