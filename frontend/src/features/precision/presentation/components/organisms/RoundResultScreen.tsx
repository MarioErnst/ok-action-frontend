import type { PrecisionRound } from '../../../../domain/PrecisionRound'
import { PrecisionScoreRow } from '../molecules/PrecisionScoreRow'
import { scoreColor } from '../../../../domain/PrecisionScores'

interface RoundResultScreenProps {
  round: PrecisionRound
  questionNumber: number
  totalQuestions: number
  isLastRound: boolean
  onNext: () => void
  onRetry: () => void
}

export function RoundResultScreen({
  round, questionNumber, totalQuestions, isLastRound, onNext, onRetry,
}: RoundResultScreenProps) {
  if (!round.audioIntelligible) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 md:p-8 pb-28 lg:pb-6 animate-fade-in">
        <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 md:p-8 text-center flex flex-col gap-4">
          <p className="text-xl md:text-2xl font-semibold text-text">No se pudo evaluar</p>
          <p className="text-text-muted text-sm">
            El audio no fue inteligible, posiblemente por ruido de fondo.
            Puedes volver a grabar la misma pregunta o continuar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onRetry}
              className="flex-1 rounded-2xl border border-border bg-surface-alt px-6 py-3 text-sm font-semibold text-text hover:border-accent/50 active:scale-95 transition-all duration-300"
            >
              Re-grabar
            </button>
            <button
              onClick={onNext}
              className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-6 py-3 font-extrabold text-text-on-accent active:scale-95 transition-all duration-300"
            >
              {isLastRound ? 'Ver resumen' : 'Siguiente pregunta'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!round.scores) return null
  const scores = round.scores
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 md:p-8 pb-28 lg:pb-6 animate-fade-in">
      <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 md:p-8 flex flex-col gap-6">
        <div className="text-center">
          <span className={`text-4xl font-bold ${scoreColor(scores.overall)}`}>
            {scores.overall}
          </span>
          <p className="text-text-muted text-sm mt-1">Pregunta {questionNumber} de {totalQuestions}</p>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <PrecisionScoreRow label="Relevancia" score={scores.relevance} />
          <PrecisionScoreRow label="Directness" score={scores.directness} />
          <PrecisionScoreRow label="Concisión" score={scores.conciseness} />
        </div>

        {round.feedback && (
          <p className="text-text-muted text-sm leading-relaxed border-t border-border pt-4">
            {round.feedback}
          </p>
        )}

        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-text-on-accent active:scale-95 transition-all duration-300"
        >
          {isLastRound ? 'Ver resumen' : 'Siguiente pregunta'}
        </button>
      </div>
    </div>
  )
}
