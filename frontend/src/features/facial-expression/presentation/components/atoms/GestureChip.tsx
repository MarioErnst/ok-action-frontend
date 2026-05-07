import type { GestureId } from '../../../domain/FacialExpression'
import { GESTURE_LABELS } from '../emotionStyles'

type Props = {
  gesture: GestureId
  // Optional intensity in 0..1; rendered as a thin progress underline so
  // chips communicate strength without taking extra vertical space.
  intensity?: number
}

export function GestureChip({ gesture, intensity }: Props) {
  const pct = intensity == null ? 0 : Math.max(0, Math.min(100, Math.round(intensity * 100)))
  return (
    <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-alt border border-border/60 text-xs text-text overflow-hidden">
      <span className="font-medium">{GESTURE_LABELS[gesture]}</span>
      {intensity != null && (
        <span
          className="absolute left-0 bottom-0 h-0.5 bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      )}
    </span>
  )
}
