import type { MuletillaSeverity } from '../../../domain/MuletillasSession'

type Props = {
  severity: MuletillaSeverity
}

// Mapeo de severidad a clases de color del sistema de diseño existente
const SEVERITY_STYLES: Record<MuletillaSeverity, string> = {
  alta: 'bg-red-400/10 text-red-400 border border-red-400/30',
  media: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30',
  baja: 'bg-green-400/10 text-green-400 border border-green-400/30',
}

const SEVERITY_LABELS: Record<MuletillaSeverity, string> = {
  alta: 'Frecuente',
  media: 'Moderada',
  baja: 'Ocasional',
}

export default function MuletillasBadge({ severity }: Props) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  )
}
