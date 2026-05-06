import { QuestionCard } from '../molecules/QuestionCard'
import { PrecisionTimer } from '../atoms/PrecisionTimer'
import type { PrecisionQuestion } from '../../../domain/PrecisionQuestion'

interface RecordAnswerScreenProps {
  question: PrecisionQuestion
  questionNumber: number
  totalQuestions: number
  isRecording: boolean
  elapsedSeconds: number
  noiseLevel: 'low' | 'medium' | 'high'
  onStartRecording: () => void
  onStopRecording: () => void
}

const NOISE_STYLES = {
  low: 'bg-success/10 text-success border-success/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  high: 'bg-danger/10 text-danger border-danger/30',
}

const NOISE_LABELS = {
  low: 'Ambiente adecuado',
  medium: 'Algo de ruido de fondo',
  high: 'Ruido alto — busca un lugar más silencioso',
}

export function RecordAnswerScreen({
  question, questionNumber, totalQuestions,
  isRecording, elapsedSeconds, noiseLevel,
  onStartRecording, onStopRecording,
}: RecordAnswerScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 sm:p-6 pb-28 lg:pb-6 animate-fade-in relative z-10">
      {/* Session progress dots */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div key={i} className={`h-3 w-3 rounded-full transition-all duration-300 ${
            i < questionNumber - 1
              ? 'bg-success'
              : i === questionNumber - 1
              ? 'bg-accent animate-scale-in'
              : 'bg-surface-alt border border-border'
          }`} />
        ))}
      </div>
      <p className="text-center text-sm text-text-muted">
        Pregunta {questionNumber} de {totalQuestions}
      </p>

      {/* Noise indicator */}
      <div className="flex justify-center">
        <span className={`rounded-full px-3 py-1 text-xs font-medium border ${NOISE_STYLES[noiseLevel]}`}>
          {NOISE_LABELS[noiseLevel]}
        </span>
      </div>

      {/* Question card */}
      <QuestionCard
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        text={question.text}
        category={question.category}
      />

      {/* Recording controls */}
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 transition-all duration-300"
        >
          GRABAR RESPUESTA
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 rounded-full bg-danger/10 px-4 py-2 border border-danger/20 animate-pulse-glow">
            <span className="h-3 w-3 rounded-full bg-danger shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <span className="text-xs font-bold text-danger uppercase tracking-wider">Grabando</span>
            <PrecisionTimer seconds={elapsedSeconds} />
          </div>
          <button
            onClick={onStopRecording}
            className="w-full rounded-2xl border border-danger/50 bg-danger/10 px-4 py-4 text-sm font-extrabold text-danger uppercase tracking-wider hover:bg-danger/20 active:scale-95 transition-all duration-300"
          >
            Terminar respuesta
          </button>
        </div>
      )}
    </div>
  )
}
