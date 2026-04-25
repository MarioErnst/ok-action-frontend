import type { PhonemeError, PhrasePronunciation, PronunciationMetrics } from '../../types'
import type { PhonemeErrorDto, PhrasePronunciationDto } from '../dto/PronunciationDtos'

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
