type Props = {
  score: number
  label?: string
  size?: number
}

export function BodyScoreRing({ score, label = 'Corporal', size = 148 }: Props) {
  const safe = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = 8
  const r = size / 2 - stroke / 2
  const c = 2 * Math.PI * r
  const offset = c - (safe / 100) * c

  const colorClass =
    safe >= 75 ? 'text-emerald-400' : safe >= 55 ? 'text-amber-300' : 'text-red-400'

  return (
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
          {safe}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-text-muted">
          {label}
        </span>
      </div>
    </div>
  )
}
