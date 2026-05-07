type ExpressionBarProps = {
  label: string
  value: number  // 0.0 – 1.0
  threshold?: number  // marks the "bad zone" start
}

export function ExpressionBar({ label, value, threshold = 0.3 }: ExpressionBarProps) {
  const pct = Math.min(value * 100, 100)
  const isHigh = value >= threshold

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-semibold ${isHigh ? 'text-danger' : 'text-text-muted'}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            isHigh ? 'bg-danger' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
