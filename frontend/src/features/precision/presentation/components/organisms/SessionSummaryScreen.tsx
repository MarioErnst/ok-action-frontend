import type { PrecisionRound } from '../../../domain/PrecisionRound'
import { scoreColor } from '../../../domain/PrecisionScores'

interface SessionSummaryScreenProps {
  overallScore: number | null
  rounds: PrecisionRound[]
  onNewSession: () => void
}

export function SessionSummaryScreen({ overallScore, rounds, onNewSession }: SessionSummaryScreenProps) {
  const displayScore = overallScore !== null ? Math.round(overallScore) : null

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 sm:p-6 pb-28 lg:pb-6 animate-fade-in">
      <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 md:p-8 flex flex-col gap-6 items-center text-center">
        <h2 className="text-xl md:text-2xl font-bold text-text">Sesión completada</h2>

        {displayScore !== null ? (
          <span className={`text-4xl sm:text-6xl font-bold animate-scale-in ${scoreColor(displayScore)}`}>
            {displayScore}
          </span>
        ) : (
          <p className="text-text-muted text-sm">Sin rondas evaluadas</p>
        )}

        {/* Per-round grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
          {rounds.map((round, idx) => (
            <div key={round.roundIndex} className="bg-surface-alt rounded-xl p-3 flex flex-col items-center gap-1">
              <span className="text-text-muted text-xs">Ronda {idx + 1}</span>
              {round.scores ? (
                <span className={`text-lg font-bold ${scoreColor(round.scores.overall)}`}>
                  {round.scores.overall}
                </span>
              ) : (
                <span className="text-text-muted text-sm">—</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onNewSession}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-text-on-accent active:scale-95 transition-all duration-300"
        >
          Nueva sesión
        </button>
      </div>
    </div>
  )
}
