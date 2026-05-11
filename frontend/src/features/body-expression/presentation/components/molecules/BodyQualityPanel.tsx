import type { LiveBodyMetrics } from '../../../domain/BodyExpression'
import { BodyStatusPill } from '../atoms/BodyStatusPill'

type Props = {
  liveMetrics: LiveBodyMetrics
}

export function BodyQualityPanel({ liveMetrics }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <BodyStatusPill tone={liveMetrics.poseVisible ? 'good' : 'bad'}>
        {liveMetrics.poseVisible ? 'Pose visible' : 'Sin pose'}
      </BodyStatusPill>
      <BodyStatusPill tone={liveMetrics.handsVisible ? 'good' : 'warn'}>
        {liveMetrics.handsVisible ? 'Manos visibles' : 'Manos fuera'}
      </BodyStatusPill>
      <BodyStatusPill tone={liveMetrics.excessiveMovement ? 'warn' : 'good'}>
        {liveMetrics.excessiveMovement ? 'Movimiento alto' : 'Movimiento estable'}
      </BodyStatusPill>
      <BodyStatusPill tone={liveMetrics.framingMode === 'mixed' ? 'warn' : 'neutral'}>
        {formatFraming(liveMetrics.framingMode)}
      </BodyStatusPill>
    </div>
  )
}

function formatFraming(mode: LiveBodyMetrics['framingMode']): string {
  if (mode === 'full_body') return 'Cuerpo completo'
  if (mode === 'upper_body') return 'Medio cuerpo'
  return 'Encuadre mixto'
}
