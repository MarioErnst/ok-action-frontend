// Session logic for the accentuation module: documentacion/modulos/acentuacion.md
import { useCallback, useEffect, useRef, useState } from 'react';
import { toPhraseEvaluation, toSaveAccentuationSessionDto } from '../../infrastructure/mappers/accentuationMapper';
import { HttpAccentuationRepository } from '../../infrastructure/repositories/HttpAccentuationRepository';
import type { AccentuationPhraseDto } from '../../infrastructure/dto/AccentuationDtos';
import type {
  AccentuationPhrase,
  AccentuationSessionResult,
  EvaluationMetrics,
  PhraseEvaluation,
  PhraseState,
} from '../../domain/AccentuationSession';
import useAudioRecorder from './useAudioRecorder';

export type AccentuationPhase = 'idle' | 'recording' | 'processing' | 'finished';
export type AccentuationCatalogStatus = 'loading' | 'ready' | 'error';

const KNOWN_CATEGORIES = ['declarative', 'interrogative', 'exclamative'] as const;
type KnownCategory = (typeof KNOWN_CATEGORIES)[number];

function toAccentuationPhrase(dto: AccentuationPhraseDto): AccentuationPhrase {
  // The catalog stores category as a free string; the domain type narrows it
  // to the three accepted values. Anything else is forced to 'declarative'
  // because category is purely visual today (no behavior depends on it).
  const category: KnownCategory = (KNOWN_CATEGORIES as readonly string[]).includes(
    dto.category,
  )
    ? (dto.category as KnownCategory)
    : 'declarative';
  return { id: dto.id, text: dto.text, category };
}

function buildPhraseStates(phrases: AccentuationPhrase[]): PhraseState[] {
  return phrases.map((phrase) => ({
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
  const [phrases, setPhrases] = useState<AccentuationPhrase[]>([]);
  const [phraseStates, setPhraseStates] = useState<PhraseState[]>([]);
  const [pendingEvaluationCount, setPendingEvaluationCount] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState<AccentuationCatalogStatus>('loading');
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const {
    isRecording,
    recordingError,
    activeStream,
    startRecording,
    stopRecording,
    releaseResources,
  } = useAudioRecorder();

  const sessionResultRef = useRef<AccentuationSessionResult | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogStatus('loading');
    HttpAccentuationRepository.listPhrases()
      .then((dtos) => {
        if (cancelled) return;
        const mapped = dtos.map(toAccentuationPhrase);
        setPhrases(mapped);
        setPhraseStates(buildPhraseStates(mapped));
        setCatalogStatus(mapped.length === 0 ? 'error' : 'ready');
        if (mapped.length === 0) {
          setCatalogError('El catálogo de frases está vacío.');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las frases. Reintenta más tarde.';
        setCatalogError(message);
        setCatalogStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (catalogStatus !== 'ready') return;
    setPhraseStates(buildPhraseStates(phrases));
    setCurrentIndex(0);
    setPendingEvaluationCount(0);
    sessionResultRef.current = null;
    savedRef.current = false;

    await startRecording();

    setPhraseStates((previous) =>
      previous.map((state, index) =>
        index === 0 ? { ...state, status: 'recording' } : state,
      ),
    );
    setPhase('recording');
  }, [catalogStatus, phrases, startRecording]);

  const finishCurrentPhrase = useCallback(async () => {
    const audioBlob = await stopRecording();
    const currentPhrase = phrases[currentIndex];
    if (!currentPhrase) return;

    sendForEvaluation(audioBlob, currentIndex, currentPhrase.text);

    const isLastPhrase = currentIndex >= phrases.length - 1;

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
  }, [currentIndex, phrases, stopRecording, sendForEvaluation, startRecording]);

  const resetSession = useCallback(() => {
    releaseResources();
    setPhraseStates(buildPhraseStates(phrases));
    setCurrentIndex(0);
    setPendingEvaluationCount(0);
    sessionResultRef.current = null;
    savedRef.current = false;
    setPhase('idle');
  }, [phrases, releaseResources]);

  return {
    phase,
    currentIndex,
    phraseStates,
    isRecording,
    recordingError,
    activeStream,
    totalPhrases: phrases.length,
    catalogStatus,
    catalogError,
    startSession,
    finishCurrentPhrase,
    resetSession,
    sessionResult: phase === 'finished' ? sessionResultRef.current : null,
  };
}
