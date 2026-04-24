export interface SpecificErrorDto {
  word: string;
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
  stress_accuracy_score: number;
  feedback: string;
  specific_errors: SpecificErrorDto[];
}

export interface SavePhraseEvaluationDto {
  phrase_text: string;
  phrase_index: number;
  overall_score: number;
  pronunciation_score: number;
  rhythm_score: number;
  intonation_score: number;
  stress_accuracy_score: number;
  feedback: string;
  specific_errors: SpecificErrorDto[];
}

export interface SaveAccentuationSessionDto {
  overall_score: number;
  pronunciation_score: number;
  rhythm_score: number;
  intonation_score: number;
  stress_accuracy_score: number;
  summary_feedback: string;
  evaluations: SavePhraseEvaluationDto[];
}

export interface AccentuationSessionDto {
  id: string;
  overall_score: number;
  pronunciation_score: number;
  rhythm_score: number;
  intonation_score: number;
  stress_accuracy_score: number;
  summary_feedback: string;
  created_at: string;
  evaluations: PhraseEvaluationDto[];
}

export interface AccentuationSessionListItemDto {
  id: string;
  overall_score: number;
  created_at: string;
}
