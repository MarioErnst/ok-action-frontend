import type { PhonemeError, PhrasePronunciation, PronunciationMetrics, PronunciationSessionResult } from '../../types'
import type { PhonemeErrorDto, PhrasePronunciationDto, SavePhrasePronunciationDto, SavePronunciationSessionDto } from '../dto/PronunciationDtos'

function toMetrics(dto: PhrasePronunciationDto): PronunciationMetrics {
  return {
    overallScore: dto.overall_score,
    vowelScore: dto.vowel_score,
    consonantScore: dto.consonant_score,
    fluencyScore: dto.fluency_score,
    intelligibilityScore: dto.intelligibility_score,
  }
}

function toPhonemeError(dto: PhonemeErrorDto): PhonemeError {
  return {
    phoneme: dto.phoneme,
    word: dto.word,
    actualIssue: dto.actual_issue,
    suggestion: dto.suggestion,
  }
}

export function toPhrasePronunciation(dto: PhrasePronunciationDto): PhrasePronunciation {
  return {
    phraseText: dto.phrase_text,
    phraseIndex: dto.phrase_index,
    metrics: toMetrics(dto),
    feedback: dto.feedback,
    phonemeErrors: dto.phoneme_errors.map(toPhonemeError),
  }
}

export function averagePronunciationMetrics(evaluations: PhrasePronunciation[]): PronunciationMetrics {
  const count = evaluations.length
  if (count === 0) {
    return {
      overallScore: 0,
      vowelScore: 0,
      consonantScore: 0,
      fluencyScore: 0,
      intelligibilityScore: 0,
    }
  }

  return {
    overallScore: evaluations.reduce((sum, ev) => sum + ev.metrics.overallScore, 0) / count,
    vowelScore: evaluations.reduce((sum, ev) => sum + ev.metrics.vowelScore, 0) / count,
    consonantScore: evaluations.reduce((sum, ev) => sum + ev.metrics.consonantScore, 0) / count,
    fluencyScore: evaluations.reduce((sum, ev) => sum + ev.metrics.fluencyScore, 0) / count,
    intelligibilityScore: evaluations.reduce((sum, ev) => sum + ev.metrics.intelligibilityScore, 0) / count,
  }
}

export function toSavePronunciationSessionDto(result: PronunciationSessionResult): SavePronunciationSessionDto {
  return {
    level: result.level,
    overall_score: result.metrics.overallScore,
    vowel_score: result.metrics.vowelScore,
    consonant_score: result.metrics.consonantScore,
    fluency_score: result.metrics.fluencyScore,
    intelligibility_score: result.metrics.intelligibilityScore,
    summary_feedback: result.summaryFeedback,
    evaluations: result.phraseEvaluations.map((ev): SavePhrasePronunciationDto => ({
      phrase_text: ev.phraseText,
      phrase_index: ev.phraseIndex,
      overall_score: ev.metrics.overallScore,
      vowel_score: ev.metrics.vowelScore,
      consonant_score: ev.metrics.consonantScore,
      fluency_score: ev.metrics.fluencyScore,
      intelligibility_score: ev.metrics.intelligibilityScore,
      feedback: ev.feedback,
      phoneme_errors: ev.phonemeErrors.map((e) => ({
        phoneme: e.phoneme,
        word: e.word,
        actual_issue: e.actualIssue,
        suggestion: e.suggestion,
      })),
    })),
  }
}
