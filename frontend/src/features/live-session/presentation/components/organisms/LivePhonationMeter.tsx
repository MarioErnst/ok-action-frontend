interface LivePhonationMeterProps {
  // Latest fundamental frequency reported by the voice monitor. Null
  // when the user is silent or the worklet has not produced a voiced
  // frame yet.
  currentHz: number | null
  // Rolling count of pitch breaks inside the last 10 seconds. Drives
  // the "tension" indicator below the Hz readout.
  breaksInWindow: number
  // Threshold at which the orchestrator will fire the auto-stop. We
  // surface it here so the bar can render the fraction visually.
  breakThreshold: number
}


// Live phonation widget for the recording screen. Shows the current Hz
// large and a small horizontal bar that fills up with each pitch break
// inside the rolling window. When breaks approach the threshold the
// bar shifts color (success -> warning -> danger) so the user gets a
// preemptive visual cue before the corten triggers.
//
// This organism is presentational. All math (pitch detection, break
// counting, thresholding) lives in `useLivePhonation`; this component
// just renders what it is told.
export function LivePhonationMeter({
  currentHz,
  breaksInWindow,
  breakThreshold,
}: LivePhonationMeterProps) {
  const hzLabel = currentHz === null ? '–' : `${Math.round(currentHz)} Hz`
  const ratio = Math.min(1, breaksInWindow / Math.max(1, breakThreshold))
  const tone =
    ratio >= 1
      ? 'bg-danger'
      : ratio >= 0.6
        ? 'bg-warning'
        : 'bg-success'

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface/60 p-4"
      aria-label="Monitor de fonación en vivo"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Fonación
        </span>
        <span className="text-xs text-text-muted">
          Saltos: {breaksInWindow}/{breakThreshold}
        </span>
      </div>
      <div className="text-3xl font-extrabold text-text tabular-nums">
        {hzLabel}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className={`h-full rounded-full transition-all duration-200 ${tone}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
