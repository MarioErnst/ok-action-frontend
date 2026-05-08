import type { ConsistencyAnalysis, ConsistencyWarningReason } from '../../domain/ConsistencySession'

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
        <div className="rounded-xl bg-accent px-4 py-2 text-xl font-black text-bg">
          {Math.round(analysis.score)}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text-muted">{analysis.fb}</p>
      <p className="text-sm leading-relaxed text-text-muted">{analysis.recommendation}</p>

      <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-3">
        {METRICS.map(([key, label]) => (
          <div key={key} className="rounded-xl bg-surface-alt/70 p-3">
            <p className="text-lg font-bold text-text">{Math.round(Number(analysis[key]))}</p>
            <p className="text-[11px] text-text-muted">{label}</p>
          </div>
        ))}
      </div>

      {analysis.timeline.length > 0 && (
        <div className="grid gap-2">
          {analysis.timeline.map((segment) => (
            <div key={segment.segment} className="rounded-xl bg-surface-alt/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold capitalize text-text">{segment.segment}</p>
                <span className="text-sm font-black text-accent">{Math.round(segment.stability)}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">{segment.note}</p>
            </div>
          ))}
        </div>
      )}

      {(analysis.strengths.length > 0 || analysis.improvement_areas.length > 0) && (
        <div className="grid gap-2 md:grid-cols-2">
          {analysis.strengths.length > 0 && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-success">Fortalezas</p>
              <ul className="mt-2 flex flex-col gap-1">
                {analysis.strengths.slice(0, 2).map((item) => (
                  <li key={item} className="text-xs text-text-muted">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.improvement_areas.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-warning">Mejorar</p>
              <ul className="mt-2 flex flex-col gap-1">
                {analysis.improvement_areas.slice(0, 2).map((item) => (
                  <li key={item} className="text-xs text-text-muted">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {analysis.volatility_events.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Cambios detectados
          </p>
          {analysis.volatility_events.map((event, index) => (
            <div key={`${event.area}-${index}`} className="rounded-xl bg-surface-alt/60 p-3">
              <p className="text-sm font-bold text-text">
                {event.area} <span className="text-text-muted">({event.segment})</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">{event.note}</p>
              <p className="mt-1 text-xs text-accent">{event.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
