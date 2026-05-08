import type { RefObject } from 'react'
import type { LandmarkPoint } from '../../../services/faceDetectionService'
import { LiveCameraOverlay } from '../molecules/LiveCameraOverlay'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
  // 0..1 fraction of calibration samples collected so far.
  progress: number
  setLandmarksCallback: (cb: ((landmarks: LandmarkPoint[]) => void) | null) => void
}

/**
 * Calibration screen shown after the user starts a session.
 *
 * The camera is already on so the wireframe gives immediate feedback that the
 * detector found their face. The progress bar tells them how long they need
 * to stay neutral. The instructional copy makes it clear that movement during
 * this step distorts the rest of the analysis.
 */
export function CalibrationView({
  videoRef,
  isCameraActive,
  progress,
  setLandmarksCallback,
}: Props) {
  const pct = Math.round(progress * 100)

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto px-4 pt-4 pb-safe gap-5">
      {/* Header pill — same visual language as the live screen so the user
          perceives this as part of the same flow, not a different page. */}
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-text-muted">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        Calibrando expresión neutral
      </div>

      <div className="flex-1 min-h-0">
        <div className="aspect-[3/4] h-full max-h-full mx-auto">
          <LiveCameraOverlay
            videoRef={videoRef}
            isActive={isCameraActive}
            setLandmarksCallback={setLandmarksCallback}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-text text-center leading-relaxed">
          Mantené tu cara natural y relajada por un momento.
          <br />
          <span className="text-text-muted text-xs">
            Esto nos permite reconocer tus expresiones reales.
          </span>
        </p>
        <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
