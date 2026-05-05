// Session logic for the accentuation module: documentacion/modulos/acentuacion.md
import { useCallback, useEffect, useRef, useState } from 'react';
import { toPhraseEvaluation, toSaveAccentuationSessionDto } from '../infrastructure/mappers/accentuationMapper';
import { HttpAccentuationRepository } from '../infrastructure/repositories/HttpAccentuationRepository';
import { ACCENTUATION_PHRASES } from '../services/phrases';
import type {
  AccentuationSessionResult,
  EvaluationMetrics,
  PhraseEvaluation,
  PhraseState,
} from '../types';
import useAudioRecorder from './useAudioRecorder';

export type AccentuationPhase = 'idle' | 'recording' | 'processing' | 'finished';

function buildInitialPhraseStates(): PhraseState[] {
  return ACCENTUATION_PHRASES.map((phrase) => ({
    phrase,
    status: 'pending',
    evaluation: null,
  }));
}

function averageMetrics(evaluations: PhraseEvaluation[]): EvaluationMetrics {
  const count = evaluations.length;
  if (count === 0) {
    return {
      overallScore: 0,
      pronunciationScore: 0,
      rhythmScore: 0,
      intonationScore: 0,
      stressAccuracyScore: 0,
    };
  }

  return {
    overallScore: evaluations.reduce((sum, ev) => sum + ev.metrics.overallScore, 0) / count,
    pronunciationScore:
      evaluations.reduce((sum, ev) => sum + ev.metrics.pronunciationScore, 0) / count,
    rhythmScore: evaluations.reduce((sum, ev) => sum + ev.metrics.rhythmScore, 0) / count,
    intonationScore:
      evaluations.reduce((sum, ev) => sum + ev.metrics.intonationScore, 0) / count,
    stressAccuracyScore:
      evaluations.reduce((sum, ev) => sum + ev.metrics.stressAccuracyScore, 0) / count,
  };
}

function buildSessionResult(phraseStates: PhraseState[]): AccentuationSessionResult {
  const completedEvaluations = phraseStates
    .filter((state) => state.evaluation !== null)
    .map((state) => state.evaluation as PhraseEvaluation);

  const aggregatedMetrics = averageMetrics(completedEvaluations);

  const overallScore = Math.round(aggregatedMetrics.overallScore);
  const summaryFeedback =
    overallScore >= 70
      ? 'Tu acentuacion es buena. Sigue practicando para perfeccionar los detalles.'
      : 'Hay areas de mejora en tu acentuacion. Presta atencion a las palabras esdrujulas y la entonacion.';

  return {
    metrics: aggregatedMetrics,
    summaryFeedback,
    phraseEvaluations: completedEvaluations,
    timestamp: Date.now(),
  };
}

export default function useAccentuationSession() {
  const [phase, setPhase] = useState<AccentuationPhase>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phraseStates, setPhraseStates] = useState<PhraseState[]>(buildInitialPhraseStates);
  const [pendingEvaluationCount, setPendingEvaluationCount] = useState(0);

  const { isRecording, recordingError, startRecording, stopRecording, releaseResources } =
    useAudioRecorder();

  const sessionResultRef = useRef<AccentuationSessionResult | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (phase === 'processing' && pendingEvaluationCount === 0) {
      sessionResultRef.current = buildSessionResult(phraseStates);
      setPhase('finished');
    }
  }, [phase, pendingEvaluationCount, phraseStates]);

  // Save the session to the backend once, when results are ready.
  // Persistence belongs in the hook, not in the results organism.
  useEffect(() => {
    const result = sessionResultRef.current;
    if (phase === 'finished' && result && !savedRef.current) {
      savedRef.current = true;
      const dto = toSaveAccentuationSessionDto(result);
      HttpAccentuationRepository.saveSession(dto).catch((error) => {
        console.error('Error saving accentuation session:', error);
      });
    }
  }, [phase]);

  const sendForEvaluation = useCallback(
    (audioBlob: Blob, phraseIndex: number, phraseText: string) => {
      setPhraseStates((previous) =>
        previous.map((state, index) =>
          index === phraseIndex ? { ...state, status: 'uploading' } : state,
        ),
      );
      setPendingEvaluationCount((previous) => previous + 1);

      HttpAccentuationRepository.evaluatePhrase(audioBlob, phraseText, phraseIndex)
        .then((dto) => {
          const evaluation = toPhraseEvaluation(dto);
          setPhraseStates((previous) =>
            previous.map((state, index) =>
              index === phraseIndex ? { ...state, status: 'evaluated', evaluation } : state,
            ),
          );
        })
        .catch(() => {
          setPhraseStates((previous) =>
            previous.map((state, index) =>
              index === phraseIndex ? { ...state, status: 'error' } : state,
            ),
          );
        })
        .finally(() => {
          setPendingEvaluationCount((previous) => previous - 1);
        });
    },
    [],
  );

  const startSession = useCallback(async () => {
    setPhraseStates(buildInitialPhraseStates());
    setCurrentIndex(0);
    setPendingEvaluationCount(0);
    sessionResultRef.current = null;

    await startRecording();

    setPhraseStates((previous) =>
      previous.map((state, index) =>
        index === 0 ? { ...state, status: 'recording' } : state,
      ),
    );
    setPhase('recording');
  }, [startRecording]);

  const finishCurrentPhrase = useCallback(async () => {
    const audioBlob = await stopRecording();
    const currentPhrase = ACCENTUATION_PHRASES[currentIndex];

    sendForEvaluation(audioBlob, currentIndex, currentPhrase.text);

    const isLastPhrase = currentIndex >= ACCENTUATION_PHRASES.length - 1;

    if (isLastPhrase) {
      setPhase('processing');
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    await startRecording();

    setPhraseStates((previous) =>
      previous.map((state, index) =>
        index === nextIndex ? { ...state, status: 'recording' } : state,
      ),
    );
  }, [currentIndex, stopRecording, sendForEvaluation, startRecording]);

  const resetSession = useCallback(() => {
    releaseResources();
    setPhraseStates(buildInitialPhraseStates());
    setCurrentIndex(0);
    setPendingEvaluationCount(0);
    sessionResultRef.current = null;
    savedRef.current = false;
    setPhase('idle');
  }, [releaseResources]);

  return {
    phase,
    currentIndex,
    phraseStates,
    isRecording,
    recordingError,
    totalPhrases: ACCENTUATION_PHRASES.length,
    startSession,
    finishCurrentPhrase,
    resetSession,
    sessionResult: phase === 'finished' ? sessionResultRef.current : null,
  };
}
