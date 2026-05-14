import type {
  PhonemeError,
  PhrasePronunciation,
  PronunciationMetrics,
  PronunciationSessionResult,
} from '../../domain/PronunciationSession';
import type {
  PhonemeErrorDto,
  PhraseEvaluationDto,
  SavePronunciationSessionDto,
} from '../dto/PronunciationDtos';

const clampPct = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const APPROX_MS_PER_PHRASE = 60_000;

function toMetrics(dto: PhraseEvaluationDto): PronunciationMetrics {
  return {
    overallScore: dto.overall_score,
    vowelScore: dto.vowel_score,
    consonantScore: dto.consonant_score,
    fluencyScore: dto.fluency_score,
    intelligibilityScore: dto.intelligibility_score,
  };
}

function toPhonemeError(dto: PhonemeErrorDto): PhonemeError {
  return {
    phoneme: dto.phoneme,
    word: dto.word,
    actualIssue: dto.actual_issue,
    suggestion: dto.suggestion,
  };
}

export function toPhrasePronunciation(
  dto: PhraseEvaluationDto,
  promptId: string,
): PhrasePronunciation {
  return {
    phraseText: dto.phrase_text,
    phraseIndex: dto.phrase_index,
    promptId,
    metrics: toMetrics(dto),
    feedback: dto.feedback,
    phonemeErrors: dto.phoneme_errors.map(toPhonemeError),
  };
}

export function averagePronunciationMetrics(
  evaluations: PhrasePronunciation[],
): PronunciationMetrics {
  const count = evaluations.length;
  if (count === 0) {
    return {
      overallScore: 0,
      vowelScore: 0,
      consonantScore: 0,
      fluencyScore: 0,
      intelligibilityScore: 0,
    };
  }

  return {
    overallScore: evaluations.reduce((sum, ev) => sum + ev.metrics.overallScore, 0) / count,
    vowelScore: evaluations.reduce((sum, ev) => sum + ev.metrics.vowelScore, 0) / count,
    consonantScore: evaluations.reduce((sum, ev) => sum + ev.metrics.consonantScore, 0) / count,
    fluencyScore: evaluations.reduce((sum, ev) => sum + ev.metrics.fluencyScore, 0) / count,
    intelligibilityScore:
      evaluations.reduce((sum, ev) => sum + ev.metrics.intelligibilityScore, 0) / count,
  };
}

export function toSavePronunciationSessionDto(
  result: PronunciationSessionResult,
  parentId?: string | null,
): SavePronunciationSessionDto {
  const phrasesCount = result.phraseEvaluations.length;
  const endedAt = new Date(result.timestamp);
  const startedAt = new Date(result.timestamp - phrasesCount * APPROX_MS_PER_PHRASE);

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    metrics: {
      level: result.level,
      vowel_score: clampPct(result.metrics.vowelScore),
      consonant_score: clampPct(result.metrics.consonantScore),
      fluency_score: clampPct(result.metrics.fluencyScore),
      intelligibility_score: clampPct(result.metrics.intelligibilityScore),
      phrases_count: phrasesCount,
    },
    phrases: result.phraseEvaluations.map((evaluation) => ({
      phrase_index: evaluation.phraseIndex,
      prompt_id: evaluation.promptId,
      vowel_score: clampPct(evaluation.metrics.vowelScore),
      consonant_score: clampPct(evaluation.metrics.consonantScore),
      fluency_score: clampPct(evaluation.metrics.fluencyScore),
      intelligibility_score: clampPct(evaluation.metrics.intelligibilityScore),
    })),
    parent_id: parentId ?? null,
  };
}
