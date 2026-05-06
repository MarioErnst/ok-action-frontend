import type { AggregatedAccError } from '../../utils/sessionSummaryHelpers'

// Maps normalized accent type names to a human-readable explanation.
const ACCENT_TYPE_EXPLANATIONS: Record<string, string> = {
  aguda: 'acento en la última sílaba (ej: café, reloj)',
  grave: 'acento en la penúltima sílaba (ej: casa, árbol)',
  esdrujula: 'acento en la antepenúltima sílaba (ej: música, físico)',
  sobreesdrujula: 'acento antes de la antepenúltima sílaba (ej: dígamelo)',
}

interface Props {
  errors: AggregatedAccError[]
}

export function AccErrorList({ errors }: Props) {
  if (!errors.length) {
    return <p className="text-sm text-success flex items-center gap-2"><span>✓</span> Sin errores de acentuación detectados.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {errors.map((e, i) => {
        const expExplanation = ACCENT_TYPE_EXPLANATIONS[e.exp.toLowerCase().replace('ú', 'u').replace('é', 'e')]
        return (
          <div key={i} className="rounded-xl border border-border/40 bg-surface-alt/30 p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-text font-bold">"{e.w}"</span>
              <span className="text-xs text-danger font-medium">
                {e.count} vez{e.count !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-success">Correcto: <strong>{e.exp}</strong></span>
              <span className="text-danger">Detectado: <strong>{e.act}</strong></span>
            </div>
            {expExplanation && (
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="text-accent font-semibold capitalize">{e.exp}</span>: {expExplanation}.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
