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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 animate-fade-in relative z-10 pb-28">
      <div className="flex flex-col items-center gap-2 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-accent/20 blur-[40px] rounded-full pointer-events-none" />
        <p className="text-xs font-bold uppercase tracking-widest text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          Evaluación de pronunciación
        </p>
        <p className="text-sm font-medium text-text-muted bg-surface-alt/50 px-3 py-1 rounded-full border border-white/5">
          Frase {currentIndex + 1} de {totalPhrases} &middot; Nivel {LEVEL_LABELS[level]}
        </p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-50" />
        <p className="text-center text-xl md:text-2xl font-bold leading-relaxed text-text relative z-10">
          {currentPhrase?.phrase.text}
        </p>
      </div>

      {isRecording && (
        <div className="flex items-center justify-center gap-3 bg-danger/10 py-2 px-4 rounded-full mx-auto border border-danger/20 animate-pulse-glow">
          <span className="h-3 w-3 rounded-full bg-danger shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <span className="text-xs font-bold text-danger uppercase tracking-wider">Grabando</span>
        </div>
      )}

      {recordingError && (
        <p className="text-center text-sm font-medium text-danger bg-danger/10 py-2 px-4 rounded-xl border border-danger/20">{recordingError}</p>
      )}

      {completedPhrases.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted/80 pl-2">Frases completadas</p>
          <div className="flex flex-col gap-2 opacity-80">
            {completedPhrases.map((state) => (
              <PhraseCard key={state.phrase.id} phraseState={state} isActive={false} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onFinishPhrase}
          disabled={!isRecording}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg disabled:opacity-40 disabled:grayscale transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
        >
          <span className="relative z-10">{isLastPhrase ? 'FINALIZAR' : 'SIGUIENTE FRASE'}</span>
          {!isRecording && <div className="absolute inset-0 bg-white/20" />}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-2xl border border-border/80 bg-surface-alt/50 backdrop-blur-sm px-8 py-3 text-sm font-medium text-text-muted hover:text-text transition-colors active:scale-95"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
