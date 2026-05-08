import type { RichnessLevel } from '../../../domain/LinguisticVersatility'

const LABELS: Record<RichnessLevel, string> = {
  1: 'Básico',
  2: 'Intermedio',
  3: 'Avanzado',
}

// Color tokens chosen from the existing design system so the badge matches
// the rest of the app (no new palette introduced).
const COLORS: Record<RichnessLevel, string> = {
  1: 'bg-text-muted/20 text-text-muted border-text-muted/40',
  2: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  3: 'bg-accent/15 text-accent border-accent/40',
}

type Props = {
  level: RichnessLevel | null
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
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs uppercase tracking-widest border ${COLORS[level]} ${size === 'sm' ? 'text-[10px] py-0.5' : ''}`}
    >
      {LABELS[level]}
    </span>
  )
}
