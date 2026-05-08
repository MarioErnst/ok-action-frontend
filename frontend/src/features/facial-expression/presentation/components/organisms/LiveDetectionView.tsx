import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { LiveDetection } from '../../../domain/FacialExpression'
import type { LandmarkPoint } from '../../../services/faceDetectionService'
import { LiveCameraOverlay } from '../molecules/LiveCameraOverlay'
import { EmotionHUD } from '../molecules/EmotionHUD'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
  detection: LiveDetection
  elapsedMs: number
  setLandmarksCallback: (cb: ((landmarks: LandmarkPoint[]) => void) | null) => void
  attachStream: (video: HTMLVideoElement | null) => void
  onStop: () => void
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Live tracking screen: camera + wireframe + HUD + stop button.
 *
 * The layout is portrait-first: camera on top, HUD below, stop button sticky
 * at the bottom honoring iOS safe area. On `lg` breakpoints (tablet/desktop)
 * the layout flips to side-by-side via CSS grid, so users with more horizontal
 * space see camera and HUD without scrolling.
 *
 * `maxGestures` is read from a media query so the chip list stays compact on
 * small screens (top 4) but shows more on wider viewports (top 10).
 */
export function LiveDetectionView({
  videoRef,
  isCameraActive,
  detection,
  elapsedMs,
  setLandmarksCallback,
  attachStream,
  onStop,
}: Props) {
  const maxGestures = useResponsiveGestureCap()

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4 pt-4 pb-safe gap-4">
      {/* Header: status pill + chronometer. Compact on phones. */}
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-text-muted">
        <div className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          En vivo
        </div>
        <span className="tabular-nums text-text">{formatMs(elapsedMs)}</span>
      </div>

      {/* Camera + HUD: stack on phones, side-by-side on lg. */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-stretch">
        <div className="aspect-[3/4] lg:aspect-auto lg:h-full">
          <LiveCameraOverlay
            videoRef={videoRef}
            isActive={isCameraActive}
            setLandmarksCallback={setLandmarksCallback}
            attachStream={attachStream}
          />
        </div>
        <div className="flex flex-col justify-start lg:overflow-y-auto">
          <EmotionHUD detection={detection} maxGestures={maxGestures} />
        </div>
      </div>

      {/* Stop button: sticky at the bottom of the viewport so it never moves
          out of reach on long HUDs. Red accent matches "destructive" intent. */}
      <button
        type="button"
        onClick={onStop}
        className="w-full py-4 rounded-2xl text-base font-semibold bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] active:scale-[0.98] transition-all duration-150"
      >
        Detener
      </button>
    </div>
  )
}

/**
 * Returns the maximum number of gesture chips to display based on viewport
 * width. Mobile gets 4 (the rest are abbreviated to "the most notorious");
 * large screens get 10 because there's room for them.
 */
function useResponsiveGestureCap(): number {
  const [cap, setCap] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 10 : 4
  )
  useEffect(() => {
    const update = () => setCap(window.innerWidth >= 1024 ? 10 : 4)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return cap
}
