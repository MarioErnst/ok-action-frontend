import type { RefObject } from 'react'
import type { LiveBodyMetrics } from '../../../domain/BodyExpression'
import type { PoseLandmarkPoint } from '../../../services/poseDetectionService'
import type { HandPresenceResult } from '../../../services/handPresenceFilter'
import { BodyMetricBar } from '../atoms/BodyMetricBar'
import { BodyQualityPanel } from '../molecules/BodyQualityPanel'
import { PoseCameraOverlay } from '../molecules/PoseCameraOverlay'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
  promptText: string
  elapsedMs: number
  liveMetrics: LiveBodyMetrics
  setLandmarksCallback: (cb: ((
    landmarks: PoseLandmarkPoint[],
    handPresence?: HandPresenceResult,
  ) => void) | null) => void
  attachStream: (video: HTMLVideoElement | null) => void
  onStop: () => void
}

export function BodyLiveSessionView({
  videoRef,
  isCameraActive,
  promptText,
  elapsedMs,
  liveMetrics,
  setLandmarksCallback,
  attachStream,
  onStop,
}: Props) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-text-muted">
        <div className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          En vivo
        </div>
        <span className="tabular-nums text-text">{formatMs(elapsedMs)}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <PoseCameraOverlay
          videoRef={videoRef}
          isActive={isCameraActive}
          setLandmarksCallback={setLandmarksCallback}
          attachStream={attachStream}
        />

        <div className="flex flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-surface/80 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              Responde la consigna
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-text">
              {promptText}
            </p>
          </div>

          <BodyQualityPanel liveMetrics={liveMetrics} />

          <div className="flex flex-col gap-3">
            <BodyMetricBar label="Postura actual" value={liveMetrics.postureScore} />
            <BodyMetricBar label="Apertura actual" value={liveMetrics.opennessScore} />
            <BodyMetricBar label="Encuadre actual" value={liveMetrics.framingScore} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="w-full rounded-2xl bg-red-500 px-4 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] transition-all active:scale-[0.98]"
      >
        Detener y analizar
      </button>
    </section>
  )
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
