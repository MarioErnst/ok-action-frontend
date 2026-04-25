export interface PhonemeErrorDto {
  phoneme: string
  word: string
  actual_issue: string
  suggestion: string
}

export interface PhrasePronunciationDto {
  phrase_text: string
  phrase_index: number
  overall_score: number
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  feedback: string
  phoneme_errors: PhonemeErrorDto[]
}

export interface SavePhrasePronunciationDto {
  phrase_text: string
  phrase_index: number
  overall_score: number
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  feedback: string
  phoneme_errors: PhonemeErrorDto[]
}

export interface SavePronunciationSessionDto {
  level: string
  overall_score: number
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  summary_feedback: string
  evaluations: SavePhrasePronunciationDto[]
}

export interface PronunciationSessionDto {
  id: string
  level: string
  overall_score: number
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  summary_feedback: string
  created_at: string
  evaluations: PhrasePronunciationDto[]
}

export interface PronunciationSessionListItemDto {
  id: string
  level: string
  overall_score: number
  created_at: string
}
