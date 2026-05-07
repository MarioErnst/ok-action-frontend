import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnalysisResult, CorrectionEvent, LiveDim, LiveSessionPhase, QARoundResult } from '../../domain/LiveSession'
import { AudioCapture } from '../../services/audioCapture'
import { WS_BASE_URL } from '../../../../api/client'

function computeNoiseLevel(pcm: ArrayBuffer): 'low' | 'medium' | 'high' {
  const int16 = new Int16Array(pcm)
  if (int16.length === 0) return 'low'
  const rms = Math.sqrt(int16.reduce((sum, s) => sum + s * s, 0) / int16.length)
  if (rms > 1500) return 'high'
  if (rms > 600) return 'medium'
  return 'low'
}

export interface QAQuestion {
  text: string
  number: number
  total: number
}

export interface LiveSessionControls {
  phase: LiveSessionPhase
  selectedDims: LiveDim[]
  analyses: AnalysisResult[]
  latestAnalysis: AnalysisResult | null
  correction: CorrectionEvent | null
  stopReason: string | null
  elapsedSeconds: number
  noiseLevel: 'low' | 'medium' | 'high'
  qaQuestion: QAQuestion | null
  qaLastResult: QARoundResult | null
  toggleDim: (dim: LiveDim) => void
  startSession: () => Promise<void>
  endSession: () => void
  resetSession: () => void
  sendAnswerDone: () => void
}

export function useLiveSession(): LiveSessionControls {
  const [phase, setPhase] = useState<LiveSessionPhase>('idle')
  const [selectedDims, setSelectedDims] = useState<LiveDim[]>(['pron'])
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null)
  const [correction, setCorrection] = useState<CorrectionEvent | null>(null)
  const [stopReason, setStopReason] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [noiseLevel, setNoiseLevel] = useState<'low' | 'medium' | 'high'>('low')
  const [qaQuestion, setQaQuestion] = useState<QAQuestion | null>(null)
  const [qaLastResult, setQaLastResult] = useState<QARoundResult | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<AudioCapture | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      captureRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const toggleDim = useCallback((dim: LiveDim) => {
    setSelectedDims((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim],
    )
  }, [])

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }))
    } else {
      wsRef.current?.close()
    }
    captureRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const sendAnswerDone = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'answer_done' }))
      setPhase('qa_evaluating')
    }
  }, [])

  const startSession = useCallback(async () => {
    // auth_token matches the key used in api/client.ts
    const token = localStorage.getItem('auth_token')
    if (!token || selectedDims.length === 0) return

    setPhase('connecting')
    setAnalyses([])
    setLatestAnalysis(null)
    setCorrection(null)
    setStopReason(null)
    setElapsedSeconds(0)
    setNoiseLevel('low')
    setQaQuestion(null)
    setQaLastResult(null)

    const ws = new WebSocket(`${WS_BASE_URL}/live/session?token=${token}`)
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', dims: selectedDims }))
    }

    ws.onmessage = async (event) => {
      if (typeof event.data !== 'string') return
      const msg = JSON.parse(event.data) as { type: string; [key: string]: unknown }

      if (msg.type === 'ready') {
        setPhase('recording')
        timerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1)
        }, 1000)

        captureRef.current = new AudioCapture()
        await captureRef.current.start((chunk) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk)
          }
          setNoiseLevel(computeNoiseLevel(chunk))
        })
      }

      if (msg.type === 'analysis') {
        const data = msg.data as AnalysisResult
        setLatestAnalysis(data)
        setAnalyses((prev) => [...prev, data])
      }

      if (msg.type === 'correction') {
        captureRef.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setCorrection({
          dim: (msg.dim as LiveDim) ?? null,
          reason: msg.reason as CorrectionEvent['reason'],
          errors: (msg.errors as CorrectionEvent['errors']) ?? [],
        })
        setPhase('correction')
      }

      if (msg.type === 'question') {
        setQaQuestion({
          text: msg.text as string,
          number: msg.number as number,
          total: msg.total as number,
        })
        setPhase('qa_question')
      }

      if (msg.type === 'round_result') {
        setQaLastResult(msg.precision as QARoundResult)
        setPhase('qa_result')
      }

      if (msg.type === 'round_unintelligible') {
        setPhase('qa_unintelligible')
      }

      if (msg.type === 'session_complete') {
        setPhase('qa_complete')
      }

      if (msg.type === 'session_ended') {
        captureRef.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setStopReason(msg.reason as string)
        setPhase('ended')
      }

      if (msg.type === 'error') {
        captureRef.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setPhase('idle')
      }
    }

    ws.onerror = () => {
      captureRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('idle')
    }

    ws.onclose = (event) => {
      wsRef.current = null
      captureRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
      if (event.code === 4001) {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
        return
      }
      setPhase((current) => {
        if (current === 'connecting' || current === 'recording') return 'idle'
        // If WS closes while an active phase is still running (e.g. ping timeout),
        // go to ended so the summary screen is shown instead of blocking.
        if (current !== 'ended' && current !== 'correction' && current !== 'idle') return 'ended'
        return current
      })
    }
  }, [selectedDims])

  const resetSession = useCallback(() => {
    wsRef.current?.close()
    captureRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    wsRef.current = null
    captureRef.current = null
    setPhase('idle')
    setAnalyses([])
    setLatestAnalysis(null)
    setCorrection(null)
    setStopReason(null)
    setElapsedSeconds(0)
    setNoiseLevel('low')
    setQaQuestion(null)
    setQaLastResult(null)
  }, [])

  return {
    phase,
    selectedDims,
    analyses,
    latestAnalysis,
    correction,
    stopReason,
    elapsedSeconds,
    noiseLevel,
    qaQuestion,
    qaLastResult,
    toggleDim,
    startSession,
    endSession,
    resetSession,
    sendAnswerDone,
  }
}
