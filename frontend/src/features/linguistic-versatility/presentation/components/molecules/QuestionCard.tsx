type Props = {
  text: string
  index: number
  total: number
}

/**
 * Card displaying the current question + progress (X de N) on top.
 *
 * Kept as a molecule (not a page section) so the same card can be reused on
 * the recording screen and the per-round review screen without duplicating
 * the typography choices.
 */
export function QuestionCard({ text, index, total }: Props) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-3xl bg-surface/85 backdrop-blur-md border border-border/60 shadow-lg">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-text-muted">
        <span>Pregunta {index + 1} de {total}</span>
      </div>
      <p className="text-base text-text leading-relaxed">{text}</p>
    </div>
  )
}
