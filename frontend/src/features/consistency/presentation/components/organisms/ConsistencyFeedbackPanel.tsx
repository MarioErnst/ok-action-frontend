import type { ConsistencyAnalysis, ConsistencyWarningReason } from '../../../domain/ConsistencySession'
import { ConsistencyMetricCard } from '../atoms/ConsistencyMetricCard'
import { ConsistencyScoreBadge } from '../atoms/ConsistencyScoreBadge'
import { ConsistencyInsightList } from '../molecules/ConsistencyInsightList'
import { ConsistencyTimelineList } from '../molecules/ConsistencyTimelineList'
import { ConsistencyVolatilityList } from '../molecules/ConsistencyVolatilityList'

const WARNING_LABELS: Record<ConsistencyWarningReason, string> = {
  audio_not_intelligible: 'No se entiende suficiente audio para evaluar.',
  low_consistency_score: 'La estabilidad bajo del minimo esperado.',
  consistency_breaks_detected: 'Hay varios cambios bruscos entre tramos.',
  analysis_unavailable: 'El analisis no estuvo disponible.',
}

const METRICS: Array<[keyof ConsistencyAnalysis, string]> = [
  ['rhythm_consistency_score', 'Ritmo'],
  ['volume_consistency_score', 'Volumen'],
  ['clarity_consistency_score', 'Claridad'],
  ['focus_consistency_score', 'Foco'],
  ['confidence_consistency_score', 'Seguridad'],
  ['structure_consistency_score', 'Estructura'],
]

interface Props {
  analysis: ConsistencyAnalysis | null
  warningReason: ConsistencyWarningReason | null
}

export function ConsistencyFeedbackPanel({ analysis, warningReason }: Props) {
  if (!analysis) {
    return (
      <div className="rounded-2xl border border-border/50 bg-surface/50 p-5 text-center">
        <p className="text-sm text-text-muted">
          El resultado aparecera al terminar el intento.
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/50 bg-surface/60 p-5">
      {warningReason && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-warning">
          {WARNING_LABELS[warningReason]}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Consistencia</p>
          <p className="text-lg font-extrabold text-text">{analysis.classification}</p>
        </div>
        <ConsistencyScoreBadge score={analysis.score} />
      </div>

      <p className="text-sm leading-relaxed text-text-muted">{analysis.fb}</p>
      <p className="text-sm leading-relaxed text-text-muted">{analysis.recommendation}</p>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {METRICS.map(([key, label]) => (
          <ConsistencyMetricCard key={key} label={label} value={Math.round(Number(analysis[key]))} />
        ))}
      </div>

      <ConsistencyTimelineList segments={analysis.timeline} />

      {(analysis.strengths.length > 0 || analysis.improvement_areas.length > 0) && (
        <div className="grid gap-2 md:grid-cols-2">
          <ConsistencyInsightList title="Fortalezas" items={analysis.strengths} tone="success" />
          <ConsistencyInsightList title="Mejorar" items={analysis.improvement_areas} tone="warning" />
        </div>
      )}

      <ConsistencyVolatilityList events={analysis.volatility_events} />
    </div>
  )
}
