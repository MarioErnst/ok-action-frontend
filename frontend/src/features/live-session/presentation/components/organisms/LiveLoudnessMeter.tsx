import type { LoudnessBand } from '../../../../loudness/domain/LoudnessSession'


interface LiveLoudnessMeterProps {
  // Latest classified band reported by the live tracker. Drives the
  // active swatch in the band strip.
  currentBand: LoudnessBand
  // How long the user has been continuously outside the optimal band
  // (too-high or clipping). Lets us draw a small progress hint when
  // the auto-stop is about to fire.
  outOfRangeStreakMs: number
  // Threshold (ms) at which the orchestrator will fire the auto-stop.
  outOfRangeThresholdMs: number
}


const BAND_ORDER: LoudnessBand[] = [
  'silence',
  'too-low',
  'optimal',
  'too-high',
  'clipping',
]

const BAND_LABELS: Record<LoudnessBand, string> = {
  silence: 'Silencio',
  'too-low': 'Bajo',
  optimal: 'Óptimo',
  'too-high': 'Alto',
  clipping: 'Saturado',
}

const BAND_TONES: Record<LoudnessBand, string> = {
  silence: 'bg-surface-alt',
  'too-low': 'bg-warning/70',
  optimal: 'bg-success',
  'too-high': 'bg-warning',
  clipping: 'bg-danger',
}


// Live loudness widget for the recording screen. A five-segment strip
// represents the band classifier; the segment matching the current
// band is highlighted, and a thin progress line below tracks how long
// the user has been in clipping (which would eventually fire the
// auto-stop).
//
// Presentational only. The classifier output and timing live in
// `useLiveLoudness`.
export function LiveLoudnessMeter({
  currentBand,
  outOfRangeStreakMs,
  outOfRangeThresholdMs,
}: LiveLoudnessMeterProps) {
  const dangerRatio = Math.min(
    1,
    outOfRangeStreakMs / Math.max(1, outOfRangeThresholdMs),
  )
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface/60 p-4"
      aria-label="Monitor de volumen en vivo"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Volumen
        </span>
        <span className="text-xs text-text-muted">{BAND_LABELS[currentBand]}</span>
      </div>
      <div className="flex gap-1.5">
        {BAND_ORDER.map((band) => {
          const active = band === currentBand
          return (
            <div
              key={band}
              className={`h-3 flex-1 rounded-md transition-all duration-150 ${BAND_TONES[band]}
                ${active ? 'ring-2 ring-text/40 scale-[1.05]' : 'opacity-60'}`}
              title={BAND_LABELS[band]}
            />
          )
        })}
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className="h-full rounded-full bg-danger transition-all duration-200"
          style={{ width: `${dangerRatio * 100}%` }}
        />
      </div>
    </div>
  )
}
