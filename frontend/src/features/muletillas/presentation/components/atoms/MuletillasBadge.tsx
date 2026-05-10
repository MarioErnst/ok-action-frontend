import type { MuletillaSeverity } from '../../../domain/MuletillasSession'

type Props = {
  severity: MuletillaSeverity
}

// Maps the backend's English severity keys to the design system colors
// and the user-facing Spanish labels rendered in the badge.
const SEVERITY_STYLES: Record<MuletillaSeverity, string> = {
  high: 'bg-red-400/10 text-red-400 border border-red-400/30',
  medium: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30',
  low: 'bg-green-400/10 text-green-400 border border-green-400/30',
}

const SEVERITY_LABELS: Record<MuletillaSeverity, string> = {
  high: 'Frecuente',
  medium: 'Moderada',
  low: 'Ocasional',
}

export default function MuletillasBadge({ severity }: Props) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  )
}
