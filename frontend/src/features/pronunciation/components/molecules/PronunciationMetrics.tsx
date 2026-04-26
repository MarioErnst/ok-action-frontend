import type { PronunciationMetrics } from '../../types'

interface MetricRowProps {
  label: string
  score: number
}

function getBarColorClass(score: number): string {
  if (score >= 70) return 'bg-success'
  if (score >= 40) return 'bg-warning'
  return 'bg-danger'
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

function MetricRow({ label, score }: MetricRowProps) {
  const rounded = Math.round(score)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className={`text-xs font-bold ${getScoreColorClass(rounded)}`}>{rounded}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-alt">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${getBarColorClass(rounded)}`}
          style={{ width: `${rounded}%` }}
        />
      </div>
    </div>
  )
}

interface PronunciationMetricsProps {
  metrics: PronunciationMetrics
}

export default function PronunciationMetrics({ metrics }: PronunciationMetricsProps) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <MetricRow label="Vocales" score={metrics.vowelScore} />
      <MetricRow label="Consonantes" score={metrics.consonantScore} />
      <MetricRow label="Fluidez" score={metrics.fluencyScore} />
      <MetricRow label="Inteligibilidad" score={metrics.intelligibilityScore} />
    </div>
  )
}
