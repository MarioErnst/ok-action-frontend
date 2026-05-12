import type { EmotionId } from '../../../domain/FacialExpression'
import { EMOTION_RING_CLASS } from '../emotionStyles'

type Props = {
  emotion: EmotionId
  // Score in 0..1 that drives both the fill arc and a subtle pulse intensity.
  intensity: number
  size?: number
}

/**
 * Decorative ring around the dominant emotion badge. Uses two SVG circles:
 * a static track and an arc whose stroke-dashoffset is tied to the intensity.
 * The fill grows/shrinks smoothly as the intensity changes (200ms transition).
 */
export function IntensityRing({ emotion, intensity, size = 96 }: Props) {
  const safe = Math.max(0, Math.min(1, intensity))
  const stroke = 4
  const r = size / 2 - stroke / 2
  const c = 2 * Math.PI * r
  const offset = c - safe * c
  const colorClass = EMOTION_RING_CLASS[emotion]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="block"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-surface-alt"
        strokeWidth={stroke}
      />
      {/* Fill arc — gradient stops are emulated with two stacked <circle>
          elements via stroke-current and a wrapping <g> with the gradient class.
          Using stroke-dashoffset gives smooth motion without layout reflows. */}
      <g className={`bg-gradient-to-tr ${colorClass}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-accent transition-all duration-300"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </g>
    </svg>
  )
}
