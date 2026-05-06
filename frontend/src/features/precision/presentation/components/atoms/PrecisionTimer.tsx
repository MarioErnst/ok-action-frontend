interface PrecisionTimerProps {
  seconds: number
}

export function PrecisionTimer({ seconds }: PrecisionTimerProps) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`

  return (
    <span className="text-text-muted text-sm tabular-nums">{display}</span>
  )
}
