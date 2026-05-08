import type { EmotionId } from '../../../domain/FacialExpression'
import { EMOTION_BAR_CLASS, EMOTION_LABELS } from '../emotionStyles'

type Props = {
  emotion: EmotionId
  // Score in 0..100 (already converted from 0..1 by callers when needed).
  percentage: number
}

export function EmotionBar({ emotion, percentage }: Props) {
  // Clamp defensively so a corrupted score never paints outside the track.
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)))
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-text-muted w-20 shrink-0">
        {EMOTION_LABELS[emotion]}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${EMOTION_BAR_CLASS[emotion]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-text tabular-nums w-10 text-right">
        {clamped}%
      </span>
    </div>
  )
}
