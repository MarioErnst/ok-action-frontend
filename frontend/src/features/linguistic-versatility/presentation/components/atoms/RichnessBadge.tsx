import type { RichnessScore } from '../../../domain/LinguisticVersatility'

// Vocabulary richness is now a 0-100 score; the badge buckets it into
// the same three named tiers the legacy 1/2/3 enum used so the UI
// experience does not change.
function bucketLabel(score: number): string {
  if (score < 34) return 'Básico'
  if (score < 67) return 'Intermedio'
  return 'Avanzado'
}

function bucketColor(score: number): string {
  if (score < 34) return 'bg-text-muted/20 text-text-muted border-text-muted/40'
  if (score < 67) return 'bg-sky-500/15 text-sky-300 border-sky-500/40'
  return 'bg-accent/15 text-accent border-accent/40'
}

type Props = {
  level: RichnessScore | null
  size?: 'sm' | 'md'
}

/** Pill that summarises vocabulary_richness as one of three named tiers. */
export function RichnessBadge({ level, size = 'md' }: Props) {
  if (level == null) {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs uppercase tracking-widest border bg-surface-alt text-text-muted border-border ${size === 'sm' ? 'text-[10px] py-0.5' : ''}`}>
        Sin datos
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs uppercase tracking-widest border ${bucketColor(level)} ${size === 'sm' ? 'text-[10px] py-0.5' : ''}`}
    >
      {bucketLabel(level)}
    </span>
  )
}
