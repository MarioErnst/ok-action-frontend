import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceDetectionService } from '../../services/faceDetectionService'
import type { LiveBlendshapes } from '../../domain/FacialExpression'

const NEUTRAL: LiveBlendshapes = { pucker: 0, brow_down: 0, lips_down: 0 }

// Smoothing factor: higher = more responsive, lower = smoother (less jitter).
const LERP = 0.2

// onRawFrame is called once per detection frame with the UNSMOOTHED blendshapes,
// directly from the detection loop, so consumers (session capture) never lose
// frames to React's render batching.
type RawFrameCallback = (raw: LiveBlendshapes) => void

export function useFaceDetector() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blendshapes, setBlendshapes] = useState<LiveBlendshapes>(NEUTRAL)

  const serviceRef = useRef<FaceDetectionService | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const smoothedRef = useRef<LiveBlendshapes>({ ...NEUTRAL })
  // mountedRef prevents state updates after unmount when an in-flight frame
  // or async load resolves.
  const mountedRef = useRef(true)
  // rawFrameCallbackRef holds the consumer's raw frame handler. Updated via
  // setRawFrameCallback so it can change without restarting detection.
  const rawFrameCallbackRef = useRef<RawFrameCallback | null>(null)

  useEffect(() => {
    mountedRef.current = true
    const svc = new FaceDetectionService()
    serviceRef.current = svc

    svc
      .load()
      .then(() => {
        if (mountedRef.current) setIsLoaded(true)
      })
      .catch((err) => {
        if (mountedRef.current) setError(`Error al cargar modelo: ${err.message}`)
      })

    return () => {
      mountedRef.current = false
      svc.dispose()
      serviceRef.current = null
    }
  }, [])

  const setRawFrameCallback = useCallback((cb: RawFrameCallback | null) => {
    rawFrameCallbackRef.current = cb
  }, [])

  // useCallback ensures startCamera has a stable reference across renders,
  // so it can be safely listed as a useEffect dependency in consumers.
  const startCamera = useCallback(async () => {
    const svc = serviceRef.current
    const video = videoRef.current
    // Guard against double-invocation: detection already running means camera is up.
    if (!svc || !video || !isLoaded || svc.isDetecting()) return

    try {
      await svc.startCamera(video)
      if (!mountedRef.current) {
        // Component unmounted while getUserMedia awaited; tear stream back down.
        svc.stopCamera()
        return
      }
      setIsCameraActive(true)
      setError(null)

      svc.startDetection(video, (raw) => {
        if (!mountedRef.current) return
        // Forward the RAW frame to the session collector immediately, so frame
        // capture never depends on React's render cycle.
        rawFrameCallbackRef.current?.(raw)

        // Lerp smoothing for the on-screen visualization only.
        const s = smoothedRef.current
        s.pucker += (raw.pucker - s.pucker) * LERP
        s.brow_down += (raw.brow_down - s.brow_down) * LERP
        s.lips_down += (raw.lips_down - s.lips_down) * LERP
        setBlendshapes({ ...s })
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de cámara'
      if (mountedRef.current) setError(`Sin acceso a la cámara: ${msg}`)
    }
  }, [isLoaded])

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera()
    setIsCameraActive(false)
    setBlendshapes({ ...NEUTRAL })
    smoothedRef.current = { ...NEUTRAL }
  }, [])

  return {
    isLoaded,
    isCameraActive,
    error,
    blendshapes,
    videoRef,
    startCamera,
    stopCamera,
    setRawFrameCallback,
  }
}
