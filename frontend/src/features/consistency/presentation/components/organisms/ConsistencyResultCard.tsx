import { ConsistencyScoreBadge } from '../atoms/ConsistencyScoreBadge'

interface Props {
  finalScore: number | null
  onResetSession: () => void
}

export function ConsistencyResultCard({ finalScore, onResetSession }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-surface/60 p-5 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Resultado</p>
        <ConsistencyScoreBadge score={finalScore} />
      </div>
      <button
        type="button"
        onClick={onResetSession}
        className="rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-bg transition-transform active:scale-95"
      >
        Repetir intento
      </button>
    </section>
  )
}
