import type { EmotionId, GestureId, LiveDetection } from '../../../domain/FacialExpression'
import { EmotionLabel } from '../atoms/EmotionLabel'
import { EmotionBar } from '../atoms/EmotionBar'
import { GestureChip } from '../atoms/GestureChip'
import { IntensityRing } from '../atoms/IntensityRing'

type Props = {
  detection: LiveDetection
  // Cap on number of gesture chips to render. Caller decides based on layout
  // (typically ~4 on portrait, ~10 on landscape/desktop).
  maxGestures?: number
}

/**
 * Live feedback panel: dominant emotion badge with intensity ring, top three
 * emotion bars, and a horizontal list of the most active gestures.
 *
 * Layout uses small gaps and tight typography so the whole HUD fits in the
 * narrow strip below the camera on a phone in portrait.
 */
export function EmotionHUD({ detection, maxGestures = 6 }: Props) {
  const dominant = detection.dominantEmotion
  const dominantScore = detection.emotions[dominant]
  const dominantPct = Math.round(dominantScore * 100)

  // Sort emotions by score descending and pick the top 3 — neutral can appear
  // when it really is the strongest signal, otherwise it sinks to the bottom.
  const topEmotions = (Object.entries(detection.emotions) as [EmotionId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Pick the most-intense gestures for compact display. Filtering happens here
  // (>= 0.25) so the hook can still pass the full set if needed elsewhere.
  const topGestures = (Object.entries(detection.gestures) as [GestureId, number][])
    .filter(([, score]) => score >= 0.25)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxGestures)

  return (
    <div className="bg-surface/85 backdrop-blur-md border border-border/60 rounded-3xl p-5 flex flex-col gap-5 shadow-lg">
      {/* Dominant emotion: ring + label + percentage. */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <IntensityRing emotion={dominant} intensity={dominantScore} size={80} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-extrabold text-text tabular-nums">
              {dominantPct}%
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Emoción dominante
          </span>
          <EmotionLabel emotion={dominant} size="lg" />
        </div>
      </div>

      {/* Top 3 emotions as horizontal bars. */}
      <div className="flex flex-col gap-2">
        {topEmotions.map(([emotion, score]) => (
          <EmotionBar key={emotion} emotion={emotion} percentage={score * 100} />
        ))}
      </div>

      {/* Active gestures as chips. Hidden when none are active to prevent a
          stale empty container from drawing attention. */}
      {topGestures.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Gestos activos
          </span>
          <div className="flex flex-wrap gap-2">
            {topGestures.map(([gesture, intensity]) => (
              <GestureChip key={gesture} gesture={gesture} intensity={intensity} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
