import { useEffect, useRef, type RefObject } from 'react'
import type { PoseLandmarkPoint } from '../../../services/poseDetectionService'
import type { HandPresenceResult } from '../../../services/handPresenceFilter'
import { clearPoseCanvas, drawPoseLandmarks } from '../../../services/poseRenderer'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  isActive: boolean
  setLandmarksCallback: (cb: ((
    landmarks: PoseLandmarkPoint[],
    handPresence?: HandPresenceResult,
  ) => void) | null) => void
  attachStream: (video: HTMLVideoElement | null) => void
}

export function PoseCameraOverlay({
  videoRef,
  isActive,
  setLandmarksCallback,
  attachStream,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video) attachStream(video)
  }, [attachStream, videoRef])

  useEffect(() => {
    setLandmarksCallback((landmarks, handPresence) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return
      drawPoseLandmarks(canvas, video, landmarks, handPresence)
    })
    return () => {
      setLandmarksCallback(null)
      clearPoseCanvas(canvasRef.current)
    }
  }, [setLandmarksCallback, videoRef])

  return (
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-border bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full scale-x-[-1] object-cover"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
          Activando camara
        </div>
      )}
    </div>
  )
}
