// Session logic for the pronunciation module: documentacion/modulos/pronunciacion.md
import { useCallback, useEffect, useRef, useState } from 'react';
import { toPhrasePronunciation, averagePronunciationMetrics, toSavePronunciationSessionDto } from '../../infrastructure/mappers/pronunciationMapper';
import { HttpPronunciationRepository } from '../../infrastructure/repositories/HttpPronunciationRepository';
import type { PronunciationPhraseDto } from '../../infrastructure/dto/PronunciationDtos';
import type {
  PhrasePronunciation,
  PhraseState,
  PronunciationLevel,
  PronunciationPhrase,
  PronunciationSessionResult,
} from '../../domain/PronunciationSession';
import useAudioRecorder from '../../../../shared/hooks/useAudioRecorder';

export type PronunciationPhase = 'idle' | 'loading' | 'recording' | 'processing' | 'finished';

function toPronunciationPhrase(
  dto: PronunciationPhraseDto,
  fallbackLevel: PronunciationLevel,
): PronunciationPhrase {
  // difficulty is a free string in prompts; collapse anything outside the
  // known levels to the level the user actually selected (defensive — the
  // backend filter already ensures matching difficulty in practice).
  const level =
    dto.difficulty === 'basico' || dto.difficulty === 'intermedio' || dto.difficulty === 'avanzado'
      ? (dto.difficulty as PronunciationLevel)
      : fallbackLevel;
  return { id: dto.id, text: dto.text, level };
}

function buildInitialPhraseStates(phrases: PronunciationPhrase[]): PhraseState[] {
  return phrases.map((phrase) => ({
    phrase,
    status: 'pending',
    evaluation: null,
  }));
}

function buildSessionResult(
  level: PronunciationLevel,
  phraseStates: PhraseState[],
): PronunciationSessionResult {
  const completedEvaluations = phraseStates
    .filter((state) => state.evaluation !== null)
    .map((state) => state.evaluation as PhrasePronunciation);

  const aggregatedMetrics = averagePronunciationMetrics(completedEvaluations);
  const overallScore = Math.round(aggregatedMetrics.overallScore);

  const summaryFeedback =
    overallScore >= 70
      ? 'Tu pronunciacion es buena. Sigue practicando para perfeccionar la articulacion.'
      : 'Hay areas de mejora en tu pronunciacion. Presta atencion a los fonemas que se senalan en cada frase.';

  return {
    level,
    metrics: aggregatedMetrics,
    summaryFeedback,
    phraseEvaluations: completedEvaluations,
    timestamp: Date.now(),
  };
}

export default function usePronunciationSession() {
  const [phase, setPhase] = useState<PronunciationPhase>('idle');
  const [currentLevel, setCurrentLevel] = useState<PronunciationLevel>('basico');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phrases, setPhrases] = useState<PronunciationPhrase[]>([]);
  const [phraseStates, setPhraseStates] = useState<PhraseState[]>([]);
  const [pendingEvaluationCount, setPendingEvaluationCount] = useState(0);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const {
    isRecording,
    recordingError,
    activeStream,
    startRecording,
    stopRecording,
    releaseResources,
  } = useAudioRecorder();

  const sessionResultRef = useRef<PronunciationSessionResult | null>(null);

  useEffect(() => {
    if (phase === 'processing' && pendingEvaluationCount === 0) {
      sessionResultRef.current = buildSessionResult(currentLevel, phraseStates);
      setPhase('finished');
    }
  }, [phase, pendingEvaluationCount, phraseStates, currentLevel]);

  const sendForEvaluation = useCallback(
    (
      audioBlob: Blob,
      phraseIndex: number,
      phraseText: string,
      level: PronunciationLevel,
      promptId: string,
    ) => {
      setPhraseStates((previous) =>
        previous.map((state, index) =>
          index === phraseIndex ? { ...state, status: 'uploading' } : state,
        ),
      );
      setPendingEvaluationCount((previous) => previous + 1);

      HttpPronunciationRepository.evaluatePhrase(audioBlob, phraseText, phraseIndex, level)
        .then((dto) => {
          const evaluation = toPhrasePronunciation(dto, promptId);
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

  const startSession = useCallback(
    async (level: PronunciationLevel) => {
      setCurrentLevel(level);
      setCatalogError(null);
      setPhase('loading');

      let dtos: PronunciationPhraseDto[];
      try {
        dtos = await HttpPronunciationRepository.listPhrases(level);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las frases. Reintenta más tarde.';
        setCatalogError(message);
        setPhase('idle');
        return;
      }

      if (dtos.length === 0) {
        setCatalogError('No hay frases disponibles para este nivel.');
        setPhase('idle');
        return;
      }

      const mappedPhrases = dtos.map((dto) => toPronunciationPhrase(dto, level));
      const initialStates = buildInitialPhraseStates(mappedPhrases);
      setPhrases(mappedPhrases);
      setPhraseStates(initialStates);
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
    },
    [startRecording],
  );

  const finishCurrentPhrase = useCallback(async () => {
    const audioBlob = await stopRecording();
    const currentPhrase = phrases[currentIndex];
    if (!currentPhrase) return;

    sendForEvaluation(
      audioBlob,
      currentIndex,
      currentPhrase.text,
      currentLevel,
      currentPhrase.id,
    );

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
  }, [currentIndex, currentLevel, phrases, stopRecording, sendForEvaluation, startRecording]);

  const savedRef = useRef(false);

  // Save the session to the backend once, when results are ready.
  // Persistence belongs in the hook, not in the results organism.
  useEffect(() => {
    const result = sessionResultRef.current;
    if (phase === 'finished' && result && !savedRef.current) {
      savedRef.current = true;
      HttpPronunciationRepository.saveSession(toSavePronunciationSessionDto(result)).catch((err) => {
        console.error('Error saving pronunciation session:', err);
      });
    }
  }, [phase]);

  const resetSession = useCallback(() => {
    releaseResources();
    setPhrases([]);
    setPhraseStates([]);
    setCurrentIndex(0);
    setPendingEvaluationCount(0);
    sessionResultRef.current = null;
    savedRef.current = false;
    setCatalogError(null);
    setPhase('idle');
  }, [releaseResources]);

  return {
    phase,
    currentLevel,
    currentIndex,
    phraseStates,
    isRecording,
    recordingError,
    activeStream,
    totalPhrases: phrases.length,
    catalogError,
    startSession,
    finishCurrentPhrase,
    resetSession,
    sessionResult: phase === 'finished' ? sessionResultRef.current : null,
  };
}
