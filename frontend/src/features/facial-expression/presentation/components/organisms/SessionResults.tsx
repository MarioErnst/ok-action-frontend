import type { QuestionResult, SessionResult } from '../../../domain/FacialExpression'

type SessionResultsProps = {
  result: SessionResult
  onRestart: () => void
}

// ScoreCircle renders an SVG ring that fills proportionally to the score (0–100).
// Color thresholds: green >= 70, yellow >= 40, red < 40.
function ScoreCircle({ score }: { score: number }) {
  const radius = 40
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = 2 * Math.PI * normalizedRadius
  const fillOffset = circumference - (score / 100) * circumference

  let colorClass: string
  if (score >= 70) {
    colorClass = 'text-green-500'
  } else if (score >= 40) {
    colorClass = 'text-yellow-500'
  } else {
    colorClass = 'text-red-500'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        aria-label={`Puntaje general: ${score}`}
      >
        {/* Background track */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          className="stroke-surface-alt"
          strokeWidth={strokeWidth}
        />
        {/* Score arc — rotated so it starts at the top */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          className={`${colorClass} stroke-current transition-all duration-700`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={fillOffset}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <span className={`text-3xl font-bold ${colorClass}`}>{Math.round(score)}</span>
      <span className="text-xs text-text-muted uppercase tracking-widest">Puntaje general</span>
    </div>
  )
}

// Scales a raw score (0.0–1.0 from the backend) to display as 0–100.
function toDisplayScore(raw: number): number {
  return Math.round(raw * 100)
}

function QuestionResultRow({ item, index }: { item: QuestionResult; index: number }) {
  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-4 text-sm text-text align-top">
        <span className="text-text-muted text-xs mr-2">{index + 1}.</span>
        <span className="line-clamp-2">{item.question_text}</span>
      </td>
      <td className="py-3 px-2 text-sm text-center text-text tabular-nums">
        {toDisplayScore(item.pucker_score)}
      </td>
      <td className="py-3 px-2 text-sm text-center text-text tabular-nums">
        {toDisplayScore(item.brow_down_score)}
      </td>
      <td className="py-3 px-2 text-sm text-center text-text tabular-nums">
        {toDisplayScore(item.lips_down_score)}
      </td>
      <td className="py-3 pl-2 text-sm text-center font-semibold text-text tabular-nums">
        {toDisplayScore(item.question_score)}
      </td>
    </tr>
  )
}

export function SessionResults({ result, onRestart }: SessionResultsProps) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto py-8 px-4">
      {/* Overall score displayed as a filled SVG ring */}
      <div className="flex justify-center">
        <ScoreCircle score={toDisplayScore(result.overall_score)} />
      </div>

      {/* Per-question breakdown table */}
      <div className="overflow-x-auto rounded-xl bg-surface p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pb-3 text-left text-xs text-text-muted uppercase tracking-wider font-medium">
                Pregunta
              </th>
              <th className="pb-3 text-center text-xs text-text-muted uppercase tracking-wider font-medium">
                Puchero
              </th>
              <th className="pb-3 text-center text-xs text-text-muted uppercase tracking-wider font-medium">
                Ceño
              </th>
              <th className="pb-3 text-center text-xs text-text-muted uppercase tracking-wider font-medium">
                Labios
              </th>
              <th className="pb-3 text-center text-xs text-text-muted uppercase tracking-wider font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {result.question_results.map((item, i) => (
              <QuestionResultRow key={item.question_id} item={item} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white active:bg-accent/80 transition-colors"
      >
        Nueva sesión
      </button>
    </div>
  )
}
