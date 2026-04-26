import type { PhraseState, PronunciationLevel } from '../../types'
import PhraseCard from '../molecules/PhraseCard'

interface RecordingScreenProps {
  level: PronunciationLevel
  currentIndex: number
  totalPhrases: number
  phraseStates: PhraseState[]
  isRecording: boolean
  recordingError: string | null
  onFinishPhrase: () => void
  onReset: () => void
}

const LEVEL_LABELS: Record<PronunciationLevel, string> = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export default function RecordingScreen({
  level,
  currentIndex,
  totalPhrases,
  phraseStates,
  isRecording,
  recordingError,
  onFinishPhrase,
  onReset,
}: RecordingScreenProps) {
  const currentPhrase = phraseStates[currentIndex]
  const isLastPhrase = currentIndex >= totalPhrases - 1
  const completedPhrases = phraseStates.filter(
    (s) => s.status !== 'pending' && s.status !== 'recording',
  )

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Evaluacion de pronunciacion
        </p>
        <p className="text-sm text-text-muted">
          Frase {currentIndex + 1} de {totalPhrases} &middot; Nivel {LEVEL_LABELS[level]}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-center text-lg font-semibold leading-relaxed text-text">
          {currentPhrase?.phrase.text}
        </p>
      </div>

      {isRecording && (
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
          <span className="text-xs text-danger">Grabando</span>
        </div>
      )}

      {recordingError && (
        <p className="text-center text-sm text-danger">{recordingError}</p>
      )}

      {completedPhrases.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-text-muted">Frases completadas</p>
          {completedPhrases.map((state) => (
            <PhraseCard key={state.phrase.id} phraseState={state} isActive={false} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onFinishPhrase}
        disabled={!isRecording}
        className="w-full rounded-xl bg-accent px-8 py-4 font-bold text-bg disabled:opacity-40"
      >
        {isLastPhrase ? 'Finalizar' : 'Siguiente frase'}
      </button>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl border border-border px-8 py-2 text-sm text-text-muted"
      >
        Cancelar
      </button>
    </div>
  )
}
