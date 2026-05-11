type Props = {
  label: string
  value: number
}

export function BodyMetricBar({ label, value }: Props) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  const colorClass =
    safe >= 75 ? 'bg-emerald-400' : safe >= 55 ? 'bg-amber-300' : 'bg-red-400'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-text">{label}</span>
        <span className="tabular-nums text-text-muted">{safe}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  )
}
