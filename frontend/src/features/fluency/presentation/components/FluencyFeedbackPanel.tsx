import type { FluencyAnalysis, FluencyWarningReason } from '../../domain/FluencySession'

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
            <p className="text-sm font-black text-accent">{analysis.wpm} <span className="text-[10px]">PPM</span></p>
          </div>
          <div className="rounded-xl bg-accent px-4 py-2 text-xl font-black text-bg">
            {Math.round(analysis.score)}
          </div>
        </div>
      </div>


      <p className="text-sm leading-relaxed text-text-muted">{analysis.fb}</p>
      <p className="text-sm leading-relaxed text-text-muted">{analysis.pace_feedback}</p>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-surface-alt/70 p-3">
          <p className="text-lg font-bold text-text">{Math.round(analysis.prompt_alignment_score)}</p>
          <p className="text-[11px] text-text-muted">Concordancia</p>
        </div>
        <div className="rounded-xl bg-surface-alt/70 p-3">
          <p className="text-lg font-bold text-text">{Math.round(analysis.coherence_score)}</p>
          <p className="text-[11px] text-text-muted">Coherencia</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-alt/70 p-3">
          <p className="text-lg font-bold text-text">{analysis.repetitions}</p>
          <p className="text-[11px] text-text-muted">Repeticiones</p>
        </div>
        <div className="rounded-xl bg-surface-alt/70 p-3">
          <p className="text-lg font-bold text-text">{analysis.restarts}</p>
          <p className="text-[11px] text-text-muted">Reinicios</p>
        </div>
        <div className="rounded-xl bg-surface-alt/70 p-3">
          <p className="text-lg font-bold text-text">{analysis.long_blocks}</p>
          <p className="text-[11px] text-text-muted">Bloqueos</p>
        </div>
      </div>

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

      {analysis.stuck_events.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Palabras trabadas
          </p>
          {analysis.stuck_events.map((event, index) => (
            <div key={`${event.word}-${index}`} className="rounded-xl bg-surface-alt/60 p-3">
              <p className="text-sm font-bold text-text">
                {event.word} <span className="text-text-muted">x{event.count}</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">{event.ctx}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

