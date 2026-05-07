import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceDetectionService } from '../../services/faceDetectionService'
import type { LiveBlendshapes } from '../../domain/FacialExpression'

const NEUTRAL: LiveBlendshapes = { pucker: 0, brow_down: 0, lips_down: 0 }

// Smoothing factor: higher = more responsive, lower = smoother (less jitter).
const LERP = 0.2

export function useFaceDetector() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blendshapes, setBlendshapes] = useState<LiveBlendshapes>(NEUTRAL)

  const serviceRef = useRef<FaceDetectionService | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const smoothedRef = useRef<LiveBlendshapes>({ ...NEUTRAL })

  useEffect(() => {
    const svc = new FaceDetectionService()
    serviceRef.current = svc

    svc
      .load()
      .then(() => setIsLoaded(true))
      .catch((err) => setError(`Error al cargar modelo: ${err.message}`))

    return () => {
      svc.dispose()
    }
  }, [])

  // useCallback ensures startCamera has a stable reference across renders,
  // so it can be safely listed as a useEffect dependency in consumers.
  const startCamera = useCallback(async () => {
    const svc = serviceRef.current
    const video = videoRef.current
    if (!svc || !video || !isLoaded) return

    try {
      await svc.startCamera(video)
      setIsCameraActive(true)
      setError(null)

      svc.startDetection(video, (raw) => {
        // Lerp smoothing to reduce per-frame jitter without adding latency.
        const s = smoothedRef.current
        s.pucker += (raw.pucker - s.pucker) * LERP
        s.brow_down += (raw.brow_down - s.brow_down) * LERP
        s.lips_down += (raw.lips_down - s.lips_down) * LERP
        setBlendshapes({ ...s })
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de cámara'
      setError(`Sin acceso a la cámara: ${msg}`)
    }
  }, [isLoaded])

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera()
    setIsCameraActive(false)
    setBlendshapes({ ...NEUTRAL })
    smoothedRef.current = { ...NEUTRAL }
  }, [])

  return { isLoaded, isCameraActive, error, blendshapes, videoRef, startCamera, stopCamera }
}
