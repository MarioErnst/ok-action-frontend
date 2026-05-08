import type {
  RichnessLevel,
  RoundResult,
} from '../../../domain/LinguisticVersatility'
import { ScoreRing } from '../atoms/ScoreRing'
import { RichnessBadge } from '../atoms/RichnessBadge'

type Props = {
  overallScore: number | null
  // Average richness across all intelligible rounds, or the single richness
  // for free mode. Null when no rounds were intelligible.
  averageRichness: RichnessLevel | null
  // Per-round detail; empty for free mode (the page renders the single
  // FeedbackPanel separately).
  rounds: RoundResult[]
  onRestart: () => void
  onExit: () => void
}

/**
 * Final results screen — shared between guided and free modes.
 *
 * Guided mode passes the rounds list and we show a per-question breakdown.
 * Free mode passes an empty list; the single result is shown by the page
 * via FeedbackPanel before this view, so we just show the ring and CTAs.
 */
export function SessionResultsView({
  overallScore,
  averageRichness,
  rounds,
  onRestart,
  onExit,
}: Props) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto px-4 py-8 overflow-y-auto h-full">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-xs uppercase tracking-widest text-accent">
          Sesión completada
        </span>
        <ScoreRing score={overallScore} />
        <RichnessBadge level={averageRichness} />
      </div>

      {rounds.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest text-text-muted">
            Detalle por pregunta
          </span>
          <ul className="flex flex-col gap-3">
            {rounds.map((r, i) => (
              <li
                key={r.id}
                className="rounded-2xl bg-surface/80 backdrop-blur-md border border-border/60 p-4 flex flex-col gap-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs uppercase tracking-widest text-text-muted">
                    Pregunta {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-text tabular-nums">
                      {r.versatility_score ?? '—'}
                    </span>
                    <RichnessBadge level={r.vocabulary_richness} size="sm" />
                  </div>
                </div>
                {r.question_text && (
                  <p className="text-sm text-text-muted line-clamp-2">{r.question_text}</p>
                )}
                {r.feedback && <p className="text-sm text-text leading-relaxed">{r.feedback}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white active:scale-[0.98] transition-all"
        >
          Nueva sesión
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full py-3 rounded-xl text-sm font-medium text-text-muted hover:text-text transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
