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
