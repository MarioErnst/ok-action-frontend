import { useEffect, useRef, type RefObject } from 'react'
import { LandmarkRenderer } from '../../../services/landmarkRenderer'
import type { LandmarkPoint } from '../../../services/faceDetectionService'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  isActive: boolean
  // Wire-in for the detector's landmark stream. The molecule registers its
  // canvas-drawing callback on mount and clears it on unmount.
  setLandmarksCallback: (cb: ((landmarks: LandmarkPoint[]) => void) | null) => void
}

/**
 * Video element with a transparent canvas overlay rendering the face mesh.
 *
 * Selfie cameras are mirrored with `scale-x-[-1]` so the user sees a natural
 * mirror image; the canvas is mirrored alongside so the wireframe tracks the
 * mirrored video instead of drifting to the opposite side.
 */
export function LiveCameraOverlay({ videoRef, isActive, setLandmarksCallback }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<LandmarkRenderer | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const renderer = new LandmarkRenderer(ctx)
    rendererRef.current = renderer

    // Push a frame to canvas every time landmarks arrive.
    const drawFrame = (landmarks: LandmarkPoint[]) => {
      renderer.syncCanvasSize(canvas, video)
      renderer.clear(canvas)
      renderer.draw(landmarks)
    }
    setLandmarksCallback(drawFrame)

    return () => {
      setLandmarksCallback(null)
      rendererRef.current = null
      // Wipe the canvas on unmount so a stale mesh never lingers if the user
      // re-enters the screen quickly.
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [videoRef, setLandmarksCallback])

  // Re-sync canvas size on viewport resize (orientation change, browser chrome).
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!canvas || !video || !renderer) return

    const onResize = () => renderer.syncCanvasSize(canvas, video)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover scale-x-[-1]"
      />
      {/* Canvas mirror matches the video mirror so landmarks stay aligned. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-text-muted text-sm">
          Cargando cámara…
        </div>
      )}
    </div>
  )
}
