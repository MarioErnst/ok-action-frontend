import { ExpressionBar } from '../atoms/ExpressionBar'
import type { LiveBlendshapes } from '../../../domain/FacialExpression'

type ExpressionPanelProps = {
  blendshapes: LiveBlendshapes
}

export function ExpressionPanel({ blendshapes }: ExpressionPanelProps) {
  return (
    <div className="bg-surface rounded-xl p-4 space-y-3">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-1">
        Expresiones en tiempo real
      </p>
      <ExpressionBar label="Puchero" value={blendshapes.pucker} threshold={0.15} />
      <ExpressionBar label="Ceño fruncido" value={blendshapes.brow_down} threshold={0.12} />
      <ExpressionBar label="Labios hacia abajo" value={blendshapes.lips_down} threshold={0.12} />
    </div>
  )
}
