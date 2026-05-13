import useAccentuationSession from '../../hooks/useAccentuationSession';
import type { AccentuationSessionResult } from '../../../domain/AccentuationSession';
import { RecordingWaveform } from '../../../../../shared/ui/molecules/RecordingWaveform';
import { StressedPhrase } from '../atoms/StressedPhrase';
import AccentuationMetrics from '../molecules/AccentuationMetrics';
import EvaluationFeedback from '../molecules/EvaluationFeedback';
import PhraseCard from '../molecules/PhraseCard';

interface RecordingScreenProps {
  onFinish: (result: AccentuationSessionResult) => void;
}

export default function RecordingScreen({ onFinish }: RecordingScreenProps) {
  const {
    phase,
    currentIndex,
    phraseStates,
    isRecording,
    recordingError,
    activeStream,
    totalPhrases,
    startSession,
    finishCurrentPhrase,
    resetSession,
    sessionResult,
  } = useAccentuationSession();

  if (phase === 'finished' && sessionResult) {
    onFinish(sessionResult);
    return null;
  }

  const currentPhrase = phraseStates[currentIndex]?.phrase;
  const isLastPhrase = currentIndex >= totalPhrases - 1;
  const isProcessing = phase === 'processing';

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 animate-fade-in relative z-10 pb-28">
      <div className="flex flex-col items-center gap-2 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-accent/20 blur-[40px] rounded-full pointer-events-none" />
        <p className="text-xs font-bold uppercase tracking-widest text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          Evaluación de acentuación
        </p>
        {phase !== 'idle' && (
          <p className="text-sm font-medium text-text-muted bg-surface-alt/50 px-3 py-1 rounded-full border border-white/5">
            Frase {currentIndex + 1} de {totalPhrases}
          </p>
        )}
      </div>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-8 mt-4">
          <div className="bg-surface/60 backdrop-blur-sm border border-border/50 p-6 rounded-3xl shadow-lg">
            <p className="text-center text-text-muted leading-relaxed">
              Lee cada frase en voz alta. Intenta pronunciar con claridad y entonación natural.
            </p>
          </div>
          <button
            type="button"
            className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            onClick={startSession}
          >
            <span className="relative z-10">COMENZAR SESIÓN</span>
          </button>
        </div>
      )}

      {phase === 'recording' && currentPhrase && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-50" />
            <StressedPhrase
              phrase={currentPhrase.text}
              className="text-center text-xl md:text-2xl font-bold leading-relaxed text-text relative z-10"
            />
            <p className="mt-3 text-center text-xs font-medium uppercase tracking-widest text-text-muted relative z-10">
              Sílaba tónica en color
            </p>
          </div>

          <div className="w-full">
            <RecordingWaveform stream={activeStream} active={isRecording} height={48} />
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

          <div className="flex flex-col gap-3">
            {phraseStates.slice(0, currentIndex).map((phraseState) => {
              const evaluatedState = phraseState;
              return (
                <div key={phraseState.phrase.id} className="flex flex-col gap-3 opacity-90 transition-opacity hover:opacity-100">
                  <PhraseCard
                    phraseState={evaluatedState}
                    isActive={false}
                  />
                  {evaluatedState.evaluation && (
                    <div className="px-2 bg-surface-alt/30 rounded-2xl p-3 border border-border/30">
                      <AccentuationMetrics metrics={evaluatedState.evaluation.metrics} />
                      <div className="mt-3">
                        <EvaluationFeedback evaluation={evaluatedState.evaluation} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-6 flex flex-col gap-3">
            <button
              type="button"
              className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
              onClick={finishCurrentPhrase}
            >
              <span className="relative z-10">{isLastPhrase ? 'FINALIZAR' : 'SIGUIENTE FRASE'}</span>
            </button>

            <button
              type="button"
              className="w-full rounded-2xl border border-border/80 bg-surface-alt/50 backdrop-blur-sm px-8 py-3 text-sm font-medium text-text-muted hover:text-text transition-colors active:scale-95"
              onClick={resetSession}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center gap-6 justify-center flex-1">
          <div className="w-16 h-16 rounded-full border-4 border-surface-alt border-t-accent animate-spin shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          <p className="text-text-muted font-medium animate-pulse">Procesando evaluaciones...</p>
        </div>
      )}
    </div>
  );
}
