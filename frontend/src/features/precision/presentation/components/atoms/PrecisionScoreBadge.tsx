import { scoreColor } from '../../../domain/PrecisionScores'

interface PrecisionScoreBadgeProps {
  score: number
  label: string
}

export function PrecisionScoreBadge({ score, label }: PrecisionScoreBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-2xl sm:text-3xl font-bold ${scoreColor(score)}`}>
        {Math.round(score)}
      </span>
      <span className="text-text-muted text-xs text-center leading-tight">{label}</span>
    </div>
  )
}
