type Props = {
  score: number | null
  size?: number
  label?: string
}

/**
 * SVG ring that fills proportionally to a 0..100 score. Same visual language
 * as facial-expression's IntensityRing so users see one consistent "score
 * indicator" across the app.
 *
 * Color thresholds mirror the rest of the suite: green ≥70, yellow ≥40, red <40.
 */
export function ScoreRing({ score, size = 160, label = 'Versatilidad' }: Props) {
  const safe = score == null ? 0 : Math.max(0, Math.min(100, Math.round(score)))
  const stroke = 8
  const r = size / 2 - stroke / 2
  const c = 2 * Math.PI * r
  const offset = c - (safe / 100) * c

  let colorClass: string
  if (score == null) colorClass = 'text-text-muted'
  else if (safe >= 70) colorClass = 'text-green-400'
  else if (safe >= 40) colorClass = 'text-amber-300'
  else colorClass = 'text-red-400'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-surface-alt"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={`${colorClass} stroke-current transition-all duration-700`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-extrabold tabular-nums ${colorClass}`}>
            {score == null ? '—' : safe}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
