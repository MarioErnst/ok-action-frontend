import type { BodyExpressionMetrics } from '../../../domain/BodyExpression'
import { BodyMetricBar } from '../atoms/BodyMetricBar'

type Props = {
  metrics: BodyExpressionMetrics
}

export function BodyMetricGrid({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BodyMetricBar label="Postura" value={metrics.postureScore} />
      <BodyMetricBar label="Apertura" value={metrics.opennessScore} />
      <BodyMetricBar label="Gestos" value={metrics.gestureScore} />
      <BodyMetricBar label="Estabilidad" value={metrics.stabilityScore} />
      <BodyMetricBar label="Energia" value={metrics.energyScore} />
      <BodyMetricBar label="Encuadre" value={metrics.framingScore} />
    </div>
  )
}
