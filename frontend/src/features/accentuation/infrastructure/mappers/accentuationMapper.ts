import type { PhraseEvaluation, AccentuationSessionResult, SpecificError } from '../../domain/AccentuationSession';
import type {
  PhraseEvaluationDto,
  SaveAccentuationSessionDto,
  SavePhraseEvaluationDto,
  SpecificErrorDto,
} from '../dto/AccentuationDtos';

export function toPhraseEvaluation(dto: PhraseEvaluationDto): PhraseEvaluation {
  return {
    phraseText: dto.phrase_text,
    phraseIndex: dto.phrase_index,
    metrics: {
      overallScore: dto.overall_score,
      pronunciationScore: dto.pronunciation_score,
      rhythmScore: dto.rhythm_score,
      intonationScore: dto.intonation_score,
      stressAccuracyScore: dto.stress_accuracy_score,
    },
    feedback: dto.feedback,
    specificErrors: dto.specific_errors.map(toSpecificError),
  };
}

function toSpecificError(dto: SpecificErrorDto): SpecificError {
  return {
    word: dto.word,
    expectedStress: dto.expected_stress,
    actualIssue: dto.actual_issue,
    suggestion: dto.suggestion,
  };
}

function toSavePhraseEvaluationDto(evaluation: PhraseEvaluation): SavePhraseEvaluationDto {
  return {
    phrase_text: evaluation.phraseText,
    phrase_index: evaluation.phraseIndex,
    overall_score: evaluation.metrics.overallScore,
    pronunciation_score: evaluation.metrics.pronunciationScore,
    rhythm_score: evaluation.metrics.rhythmScore,
    intonation_score: evaluation.metrics.intonationScore,
    stress_accuracy_score: evaluation.metrics.stressAccuracyScore,
    feedback: evaluation.feedback,
    specific_errors: evaluation.specificErrors.map((error) => ({
      word: error.word,
      expected_stress: error.expectedStress,
      actual_issue: error.actualIssue,
      suggestion: error.suggestion,
    })),
  };
}

export function toSaveAccentuationSessionDto(
  result: AccentuationSessionResult,
): SaveAccentuationSessionDto {
  return {
    overall_score: result.metrics.overallScore,
    pronunciation_score: result.metrics.pronunciationScore,
    rhythm_score: result.metrics.rhythmScore,
    intonation_score: result.metrics.intonationScore,
    stress_accuracy_score: result.metrics.stressAccuracyScore,
    summary_feedback: result.summaryFeedback,
    evaluations: result.phraseEvaluations.map(toSavePhraseEvaluationDto),
  };
}
