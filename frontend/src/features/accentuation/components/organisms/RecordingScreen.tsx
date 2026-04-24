import useAccentuationSession from '../../hooks/useAccentuationSession';
import type { AccentuationSessionResult } from '../../types';
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-wider text-text-muted">
          Evaluacion de acentuacion
        </p>
        {phase !== 'idle' && (
          <p className="text-sm text-text-muted">
            Frase {currentIndex + 1} de {totalPhrases}
          </p>
        )}
      </div>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-6">
          <p className="text-center text-text-muted">
            Lee cada frase en voz alta. Intenta pronunciar con claridad y entonacion natural.
          </p>
          <button
            type="button"
            className="w-full rounded-xl bg-accent px-8 py-4 font-bold text-bg"
            onClick={startSession}
          >
            Comenzar
          </button>
        </div>
      )}

      {phase === 'recording' && currentPhrase && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-center text-lg font-semibold leading-relaxed text-text">
              {currentPhrase.text}
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

          <div className="flex flex-col gap-2">
            {phraseStates.slice(0, currentIndex).map((phraseState, index) => {
              const evaluatedState = phraseState;
              return (
                <div key={phraseState.phrase.id} className="flex flex-col gap-2">
                  <PhraseCard
                    phraseState={evaluatedState}
                    isActive={false}
                  />
                  {evaluatedState.evaluation && (
                    <div className="px-2">
                      <AccentuationMetrics metrics={evaluatedState.evaluation.metrics} />
                      <div className="mt-2">
                        <EvaluationFeedback evaluation={evaluatedState.evaluation} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-accent px-8 py-4 font-bold text-bg"
            onClick={finishCurrentPhrase}
          >
            {isLastPhrase ? 'Finalizar' : 'Siguiente frase'}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-border px-8 py-2 text-sm text-text-muted"
            onClick={resetSession}
          >
            Cancelar
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-text-muted">Procesando evaluaciones...</p>
        </div>
      )}
    </div>
  );
}
