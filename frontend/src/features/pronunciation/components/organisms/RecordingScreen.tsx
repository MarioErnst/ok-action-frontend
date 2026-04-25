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
  const completedCount = phraseStates.filter((s) => s.status === 'evaluated').length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pronunciacion</h2>
          <p className="text-sm text-gray-500">Nivel: {LEVEL_LABELS[level]}</p>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>

      <div className="rounded-xl bg-blue-600 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-widest opacity-70">
          Frase {currentIndex + 1} de {totalPhrases}
        </p>
        <p className="mt-2 text-xl font-semibold leading-snug">
          {currentPhrase?.phrase.text}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {isRecording && (
          <div className="flex items-center gap-2 text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-sm font-medium">Grabando...</span>
          </div>
        )}

        {recordingError && (
          <p className="text-sm text-red-600">{recordingError}</p>
        )}

        <button
          onClick={onFinishPhrase}
          disabled={!isRecording}
          className="w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {isLastPhrase ? 'Terminar sesion' : 'Siguiente frase'}
        </button>
      </div>

      {completedCount > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-500">Frases completadas</p>
          {phraseStates
            .filter((s) => s.status !== 'pending' && s.status !== 'recording')
            .map((state) => (
              <PhraseCard
                key={state.phrase.id}
                phraseState={state}
                isActive={false}
              />
            ))}
        </div>
      )}
    </div>
  )
}
