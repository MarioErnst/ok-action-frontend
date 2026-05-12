import type { RichnessScore } from '../../../domain/LinguisticVersatility'
import { RichnessBadge } from '../atoms/RichnessBadge'

type Props = {
  versatilityScore: number | null
  vocabularyRichness: RichnessScore | null
  feedback: string | null
  audioIntelligible: boolean
}

/**
 * Result panel shown after a single round (guided) or the whole free-mode
 * session. Combines score, richness tier, and the textual feedback Gemini
 * returned, plus a fallback when the audio came back as unintelligible.
 */
export function FeedbackPanel({
  versatilityScore,
  vocabularyRichness,
  feedback,
  audioIntelligible,
}: Props) {
  if (!audioIntelligible) {
    return (
      <div className="rounded-3xl bg-surface/85 backdrop-blur-md border border-amber-500/40 p-5 flex flex-col gap-2 text-center">
        <span className="text-xs uppercase tracking-widest text-amber-300">Audio no claro</span>
        <p className="text-sm text-text-muted">
          No se pudo procesar la grabación. Intentá de nuevo en un lugar más silencioso o más cerca del micrófono.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-surface/85 backdrop-blur-md border border-border/60 p-5 flex flex-col gap-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-text tabular-nums">
            {versatilityScore ?? '—'}
          </span>
          <span className="text-xs uppercase tracking-widest text-text-muted">/ 100</span>
        </div>
        <RichnessBadge level={vocabularyRichness} />
      </div>
      {feedback && <p className="text-sm text-text leading-relaxed">{feedback}</p>}
    </div>
  )
}
