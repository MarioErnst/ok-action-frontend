import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceDetectionService, type LandmarkPoint } from '../../services/faceDetectionService'
import { classify } from '../../services/emotionClassifier'
import type { LiveDetection } from '../../domain/FacialExpression'

const NEUTRAL_DETECTION: LiveDetection = {
  emotions: { happy: 0, sad: 0, angry: 0, surprise: 0, fear: 0, disgust: 0, neutral: 1 },
  gestures: {},
  dominantEmotion: 'neutral',
}

// Smoothing factor for the on-screen emotion bars: higher = more responsive,
// lower = smoother. 0.25 keeps bars readable without lag.
const LERP = 0.25

// Direct callbacks fire synchronously from the detection loop, bypassing
// React's render batching so consumers (session capture, canvas overlay)
// never lose a frame.
type DetectionCallback = (detection: LiveDetection) => void
type LandmarksCallback = (landmarks: LandmarkPoint[]) => void

export function useFaceDetector() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Smoothed live detection used to drive the HUD; raw values still flow
  // straight to the consumer callbacks for accurate event capture.
  const [detection, setDetection] = useState<LiveDetection>(NEUTRAL_DETECTION)

  const serviceRef = useRef<FaceDetectionService | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const smoothedRef = useRef<LiveDetection>({ ...NEUTRAL_DETECTION, emotions: { ...NEUTRAL_DETECTION.emotions } })
  const mountedRef = useRef(true)
  const detectionCallbackRef = useRef<DetectionCallback | null>(null)
  const landmarksCallbackRef = useRef<LandmarksCallback | null>(null)

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

  const setDetectionCallback = useCallback((cb: DetectionCallback | null) => {
    detectionCallbackRef.current = cb
  }, [])

  const setLandmarksCallback = useCallback((cb: LandmarksCallback | null) => {
    landmarksCallbackRef.current = cb
  }, [])

  const startCamera = useCallback(async () => {
    const svc = serviceRef.current
    const video = videoRef.current
    if (!svc || !video || !isLoaded || svc.isDetecting()) return

    try {
      await svc.startCamera(video)
      if (!mountedRef.current) {
        svc.stopCamera()
        return
      }
      setIsCameraActive(true)
      setError(null)

      svc.startDetection(video, ({ blendshapes, landmarks }) => {
        if (!mountedRef.current) return

        const live = classify(blendshapes)

        // Push raw detection straight to the session capture so events fire
        // exactly when the dominant emotion changes, regardless of render timing.
        detectionCallbackRef.current?.(live)
        landmarksCallbackRef.current?.(landmarks)

        // Smooth emotion bars for the visual HUD only.
        const s = smoothedRef.current
        for (const key of Object.keys(s.emotions) as Array<keyof typeof s.emotions>) {
          s.emotions[key] += (live.emotions[key] - s.emotions[key]) * LERP
        }
        s.gestures = live.gestures
        s.dominantEmotion = live.dominantEmotion
        setDetection({
          emotions: { ...s.emotions },
          gestures: s.gestures,
          dominantEmotion: s.dominantEmotion,
        })
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de cámara'
      if (mountedRef.current) setError(`Sin acceso a la cámara: ${msg}`)
    }
  }, [isLoaded])

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera()
    setIsCameraActive(false)
    setDetection(NEUTRAL_DETECTION)
    smoothedRef.current = { ...NEUTRAL_DETECTION, emotions: { ...NEUTRAL_DETECTION.emotions } }
  }, [])

  return {
    isLoaded,
    isCameraActive,
    error,
    detection,
    videoRef,
    startCamera,
    stopCamera,
    setDetectionCallback,
    setLandmarksCallback,
  }
}
