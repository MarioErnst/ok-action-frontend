import type { PronunciationMetrics } from '../../types'

interface MetricBarProps {
  label: string
  score: number
}

function MetricBar({ label, score }: MetricBarProps) {
  const rounded = Math.round(score)
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-gray-600 text-right">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${rounded}%` }}
        />
      </div>
      <span className="w-8 text-sm font-medium text-gray-800">{rounded}</span>
    </div>
  )
}

interface PronunciationMetricsProps {
  metrics: PronunciationMetrics
}

export default function PronunciationMetrics({ metrics }: PronunciationMetricsProps) {
  return (
    <div className="flex flex-col gap-3">
      <MetricBar label="Vocales" score={metrics.vowelScore} />
      <MetricBar label="Consonantes" score={metrics.consonantScore} />
      <MetricBar label="Fluidez" score={metrics.fluencyScore} />
      <MetricBar label="Inteligibilidad" score={metrics.intelligibilityScore} />
    </div>
  )
}
