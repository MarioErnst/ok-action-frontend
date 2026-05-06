import type { AggregatedPronError } from '../../utils/sessionSummaryHelpers'

interface Props {
  errors: AggregatedPronError[]
}

export function PronErrorList({ errors }: Props) {
  if (!errors.length) {
    return <p className="text-sm text-success flex items-center gap-2"><span>✓</span> Sin errores de pronunciación detectados.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {errors.map((e) => (
        <div key={e.ph} className="rounded-xl border border-border/40 bg-surface-alt/30 p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-accent font-bold text-sm">/{e.ph}/</span>
            <span className="text-xs text-danger font-medium">
              {e.count} vez{e.count !== 1 ? 'es' : ''}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Detectado en: <span className="text-text font-medium">{e.words.map(w => `"${w}"`).join(', ')}</span>
          </p>
          <p className="text-sm text-text leading-relaxed">
            <span className="text-accent font-semibold">Cómo mejorar: </span>{e.fix}
          </p>
        </div>
      ))}
    </div>
  )
}
