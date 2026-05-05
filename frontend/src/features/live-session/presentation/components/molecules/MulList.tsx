import type { AggregatedMul } from '../../utils/sessionSummaryHelpers'

interface Props {
  muls: AggregatedMul[]
}

export function MulList({ muls }: Props) {
  if (!muls.length) {
    return <p className="text-sm text-success flex items-center gap-2"><span>✓</span> No se detectaron muletillas.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {muls.map((m) => (
        <div key={m.w} className="rounded-xl border border-border/40 bg-surface-alt/30 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-text font-bold">"{m.w}"</span>
            <span className="text-xs text-danger font-medium">
              {m.totalCount} repetición{m.totalCount !== 1 ? 'es' : ''} en total
            </span>
          </div>
          {m.contexts.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Dónde la usaste:</p>
              {m.contexts.map((ctx, i) => (
                <p key={i} className="text-xs text-text bg-surface/60 border border-border/30 rounded-lg px-3 py-1.5 italic">
                  "…{ctx}…"
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-text-muted leading-relaxed">
            Las muletillas fragmentan el discurso y reducen la autoridad percibida.
            Reemplázala con una pausa breve o reformula la oración.
          </p>
        </div>
      ))}
    </div>
  )
}
