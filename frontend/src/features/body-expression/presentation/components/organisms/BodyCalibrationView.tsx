import type { RefObject } from 'react'
import type { PoseLandmarkPoint } from '../../../services/poseDetectionService'
import type { HandPresenceResult } from '../../../services/handPresenceFilter'
import { PoseCameraOverlay } from '../molecules/PoseCameraOverlay'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
  progress: number
  setLandmarksCallback: (cb: ((
    landmarks: PoseLandmarkPoint[],
    handPresence?: HandPresenceResult,
  ) => void) | null) => void
  attachStream: (video: HTMLVideoElement | null) => void
}

export function BodyCalibrationView({
  videoRef,
  isCameraActive,
  progress,
  setLandmarksCallback,
  attachStream,
}: Props) {
  const pct = Math.round(progress * 100)

  return (
    <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <PoseCameraOverlay
        videoRef={videoRef}
        isActive={isCameraActive}
        setLandmarksCallback={setLandmarksCallback}
        attachStream={attachStream}
      />

      <div className="flex flex-col justify-center gap-4 rounded-2xl border border-border bg-surface/80 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Calibracion
        </p>
        <h2 className="text-2xl font-extrabold text-text">
          Mantente en una postura natural
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Mira a la camara, relaja hombros y deja tus manos dentro del encuadre.
          Esta base permite evaluar movimiento relativo a tu propia postura.
        </p>
        <div className="h-3 overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full rounded-full bg-accent transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-text-muted">
          {pct}% calibrado
        </span>
      </div>
    </section>
  )
}
