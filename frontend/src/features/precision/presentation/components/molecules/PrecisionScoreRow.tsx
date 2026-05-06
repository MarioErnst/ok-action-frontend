import { scoreColor, scoreBgColor } from '../../../../domain/PrecisionScores'

interface PrecisionScoreRowProps {
  label: string
  score: number
}

export function PrecisionScoreRow({ label, score }: PrecisionScoreRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-sm">{label}</span>
        <span className={`font-bold text-sm ${scoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-alt">
        <div
          className={`h-full rounded-full transition-all duration-300 ${scoreBgColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
