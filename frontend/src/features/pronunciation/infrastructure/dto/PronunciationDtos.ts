// DTOs for the uniform-schema pronunciation backend. Same shape as
// accentuation but with the four pronunciation sub-scores (vowel,
// consonant, fluency, intelligibility) plus a free-string level field
// chosen by the user at start.

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

export interface PronunciationPhraseDto {
  id: string;
  text: string;
  difficulty: string;
}

export interface PhonemeErrorDto {
  phoneme: string;
  word: string;
  actual_issue: string;
  suggestion: string;
}

export interface PhraseEvaluationDto {
  phrase_text: string;
  phrase_index: number;
  overall_score: number;
  vowel_score: number;
  consonant_score: number;
  fluency_score: number;
  intelligibility_score: number;
  feedback: string;
  phoneme_errors: PhonemeErrorDto[];
}

export interface PronunciationMetricsDto {
  level: string;
  vowel_score: number;
  consonant_score: number;
  fluency_score: number;
  intelligibility_score: number;
  phrases_count: number;
}

export interface SavePronunciationSessionDto {
  started_at: string;
  ended_at: string;
  metrics: PronunciationMetricsDto;
  parent_id?: string | null;
}

export interface PronunciationSessionDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  created_at: string;
  metrics: PronunciationMetricsDto;
}

export interface PronunciationSessionListItemDto {
  id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  level: string;
  phrases_count: number;
}
