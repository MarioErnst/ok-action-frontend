import type { FluencyAnalysis, FluencyWarningReason } from '../../../domain/FluencySession'
import { FluencyMetricCard } from '../atoms/FluencyMetricCard'
import { FluencyScoreBadge } from '../atoms/FluencyScoreBadge'
import { FluencyInsightList } from '../molecules/FluencyInsightList'
import { FluencyStuckEventsList } from '../molecules/FluencyStuckEventsList'

const WARNING_LABELS: Record<FluencyWarningReason, string> = {
  low_fluency_score: 'La fluidez bajo demasiado.',
  fluency_blocks_detected: 'Se detectaron trabas o repeticiones relevantes.',
  time_limit: 'La sesion llego al limite de tiempo.',
  not_aligned_with_prompt: 'La respuesta se esta alejando de la consigna.',
  audio_not_intelligible: 'No se entiende suficiente audio para evaluar.',
}

interface Props {
  analysis: FluencyAnalysis | null
  warningReason: FluencyWarningReason | null
}

export function FluencyFeedbackPanel({ analysis, warningReason }: Props) {
  if (!analysis) {
    return (
      <div className="rounded-2xl border border-border/50 bg-surface/50 p-5 text-center">
        <p className="text-sm text-text-muted">
          El feedback aparecera mientras hablas. Intenta responder de forma continua.
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/50 bg-surface/60 p-5">
      {warningReason && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">
          {WARNING_LABELS[warningReason]}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Fluidez</p>
          <p className="text-lg font-extrabold text-text">{analysis.classification}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-tighter text-text-muted">Velocidad</p>
            <p className="text-sm font-black text-accent">
              {analysis.wpm} <span className="text-[10px]">PPM</span>
            </p>
          </div>
          <FluencyScoreBadge score={analysis.score} />
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text-muted">{analysis.fb}</p>
      <p className="text-sm leading-relaxed text-text-muted">{analysis.pace_feedback}</p>

      <div className="grid grid-cols-2 gap-2">
        <FluencyMetricCard label="Concordancia" value={Math.round(analysis.prompt_alignment_score)} />
        <FluencyMetricCard label="Coherencia" value={Math.round(analysis.coherence_score)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <FluencyMetricCard label="Repeticiones" value={analysis.repetitions} />
        <FluencyMetricCard label="Reinicios" value={analysis.restarts} />
        <FluencyMetricCard label="Bloqueos" value={analysis.long_blocks} />
      </div>

      {(analysis.strengths.length > 0 || analysis.improvement_areas.length > 0) && (
        <div className="grid gap-2 md:grid-cols-2">
          <FluencyInsightList title="Fortalezas" items={analysis.strengths} tone="success" />
          <FluencyInsightList title="Mejorar" items={analysis.improvement_areas} tone="warning" />
        </div>
      )}

      <FluencyStuckEventsList events={analysis.stuck_events} />
    </div>
  )
}
