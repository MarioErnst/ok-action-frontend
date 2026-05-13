import type {
  PhraseEvaluation,
  AccentuationSessionResult,
  SpecificError,
} from '../../domain/AccentuationSession';
import type {
  PhraseEvaluationDto,
  PhraseSpecificErrorDto,
  SaveAccentuationSessionDto,
} from '../dto/AccentuationDtos';

const clampPct = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function toPhraseEvaluation(dto: PhraseEvaluationDto): PhraseEvaluation {
  return {
    phraseText: dto.phrase_text,
    phraseIndex: dto.phrase_index,
    metrics: {
      overallScore: dto.overall_score,
      pronunciationScore: dto.pronunciation_score,
      rhythmScore: dto.rhythm_score,
      intonationScore: dto.intonation_score,
      stressAccuracyScore: dto.stress_score,
    },
    feedback: dto.feedback,
    specificErrors: dto.specific_errors.map(toSpecificError),
  };
}

function toSpecificError(dto: PhraseSpecificErrorDto): SpecificError {
  const wordIndex = dto.word_index ?? null;
  // Gemini uses -1 to mean "could not determine which syllable was stressed";
  // normalize that to null so the UI can branch on its presence cleanly.
  const rawActual = dto.actual_stressed_syllable_index;
  const actualStressedSyllableIndex =
    rawActual === undefined || rawActual === null || rawActual < 0 ? null : rawActual;
  return {
    word: dto.word,
    wordIndex,
    actualStressedSyllableIndex,
    expectedStress: dto.expected_stress,
    actualIssue: dto.actual_issue,
    suggestion: dto.suggestion,
  };
}

// Rough estimate: backend wants started_at / ended_at on the session row
// but the frontend only tracks the moment of finalization. Use the
// timestamp as ended_at and approximate started_at as 1 minute earlier
// per phrase (the actual recording time is opaque to the use_case).
const APPROX_MS_PER_PHRASE = 60_000;

export function toSaveAccentuationSessionDto(
  result: AccentuationSessionResult,
  parentId?: string | null,
): SaveAccentuationSessionDto {
  const phrasesCount = result.phraseEvaluations.length;
  const endedAt = new Date(result.timestamp);
  const startedAt = new Date(
    result.timestamp - phrasesCount * APPROX_MS_PER_PHRASE,
  );

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    metrics: {
      pronunciation_score: clampPct(result.metrics.pronunciationScore),
      rhythm_score: clampPct(result.metrics.rhythmScore),
      intonation_score: clampPct(result.metrics.intonationScore),
      stress_score: clampPct(result.metrics.stressAccuracyScore),
      phrases_count: phrasesCount,
    },
    parent_id: parentId ?? null,
  };
}
