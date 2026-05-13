// DTOs for the uniform-schema accentuation backend. The /evaluate endpoint
// stays per-phrase and ephemeral (Gemini-generated text fields are shown
// in the UI but not persisted); the /sessions endpoints persist only the
// aggregated four sub-scores plus the phrase count.

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

export interface PhraseSpecificErrorDto {
  word: string;
  word_index?: number | null;
  actual_stressed_syllable_index?: number | null;
  expected_stress: string;
  actual_issue: string;
  suggestion: string;
}

export interface PhraseEvaluationDto {
  phrase_text: string;
  phrase_index: number;
  overall_score: number;
  pronunciation_score: number;
  rhythm_score: number;
  intonation_score: number;
  stress_score: number;
  feedback: string;
  specific_errors: PhraseSpecificErrorDto[];
}

export interface AccentuationMetricsDto {
  pronunciation_score: number;
  rhythm_score: number;
  intonation_score: number;
  stress_score: number;
  phrases_count: number;
}

export interface SaveAccentuationSessionDto {
  started_at: string;
  ended_at: string;
  metrics: AccentuationMetricsDto;
  parent_id?: string | null;
}

export interface AccentuationSessionDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  created_at: string;
  metrics: AccentuationMetricsDto;
}

export interface AccentuationSessionListItemDto {
  id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  phrases_count: number;
}
