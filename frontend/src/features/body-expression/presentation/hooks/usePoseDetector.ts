import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PoseDetectionService,
  type PoseDetectionFrame,
  type PoseLandmarkPoint,
} from '../../services/poseDetectionService'
import type { HandPresenceResult } from '../../services/handPresenceFilter'

type FrameCallback = (frame: PoseDetectionFrame) => PoseDetectionFrame | void
type LandmarksCallback = (
  landmarks: PoseLandmarkPoint[],
  handPresence?: HandPresenceResult,
) => void

export function usePoseDetector() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const serviceRef = useRef<PoseDetectionService | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mountedRef = useRef(true)
  const frameCallbackRef = useRef<FrameCallback | null>(null)
  const landmarksCallbackRef = useRef<LandmarksCallback | null>(null)

  useEffect(() => {
    mountedRef.current = true
    const svc = new PoseDetectionService()
    serviceRef.current = svc

    svc
      .load()
      .then(() => {
        if (mountedRef.current) setIsLoaded(true)
      })
      .catch((err) => {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : 'No se pudo cargar el modelo'
          setError(`Error al cargar Pose Landmarker: ${message}`)
        }
      })

    return () => {
      mountedRef.current = false
      svc.dispose()
      serviceRef.current = null
    }
  }, [])

  const setFrameCallback = useCallback((cb: FrameCallback | null) => {
    frameCallbackRef.current = cb
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

      svc.startDetection((frame) => {
        if (!mountedRef.current) return
        const processedFrame = frameCallbackRef.current?.(frame) ?? frame
        landmarksCallbackRef.current?.(
          processedFrame.landmarks,
          processedFrame.handPresence,
        )
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de camara'
      if (mountedRef.current) setError(`Sin acceso a la camara: ${message}`)
    }
  }, [isLoaded])

  const stopCamera = useCallback(() => {
    serviceRef.current?.stopCamera()
    setIsCameraActive(false)
  }, [])

  const attachStream = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return
    serviceRef.current?.attachStream(video)
  }, [])

  return {
    isLoaded,
    isCameraActive,
    error,
    videoRef,
    startCamera,
    stopCamera,
    attachStream,
    setFrameCallback,
    setLandmarksCallback,
  }
}
