import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRecorder } from '../../services/audioRecorder'
import { HttpLinguisticVersatilityRepository } from '../../infrastructure/HttpLinguisticVersatilityRepository'
import type { FreeSessionResponse, FreeStatus } from '../../domain/LinguisticVersatility'

/**
 * Free-mode orchestration: idle → recording → uploading → results.
 *
 * Single round, single audio, single response — no question selection, no
 * round buffer. Mirrors the guided hook's anti-double-click pattern via
 * statusRef so a fast second click on Detener never hits the network twice.
 */
export function useFreeVersatilitySession() {
  const [status, setStatus] = useState<FreeStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FreeSessionResponse | null>(null)

  const recorderRef = useRef<AudioRecorder | null>(null)
  const statusRef = useRef<FreeStatus>('idle')
  statusRef.current = status

  const startRecording = useCallback(async () => {
    if (statusRef.current !== 'idle' && statusRef.current !== 'error') return
    statusRef.current = 'recording'
    setStatus('recording')
    setError(null)
    setResult(null)
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
    if (!recorder) {
      statusRef.current = 'error'
      setError('No hay grabación en curso.')
      setStatus('error')
      return
    }

    try {
      const audio = await recorder.stop()
      recorderRef.current = null
      const res = await HttpLinguisticVersatilityRepository.submitFreeSession(audio)
      setResult(res)
      statusRef.current = 'results'
      setStatus('results')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el audio'
      statusRef.current = 'error'
      setError(msg)
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
    statusRef.current = 'idle'
    setStatus('idle')
    setError(null)
    setResult(null)
  }, [])

  // Cancel any in-flight recording on unmount so the mic light goes off.
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel()
    }
  }, [])

  return {
    status,
    error,
    result,
    startRecording,
    stopAndUpload,
    reset,
  }
}
