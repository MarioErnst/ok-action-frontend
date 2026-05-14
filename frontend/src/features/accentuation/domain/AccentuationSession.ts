export interface AccentuationPhrase {
  id: string;
  text: string;
  category: 'declarative' | 'interrogative' | 'exclamative';
}

export interface SpecificError {
  word: string;
  /** 0-based index of the word within the phrase, or null if not reported. */
  wordIndex: number | null;
  /** 0-based index of the syllable the speaker actually stressed, or null. */
  actualStressedSyllableIndex: number | null;
  expectedStress: string;
  actualIssue: string;
  suggestion: string;
}

export interface EvaluationMetrics {
  overallScore: number;
  pronunciationScore: number;
  rhythmScore: number;
  intonationScore: number;
  stressAccuracyScore: number;
}

export interface PhraseEvaluation {
  phraseText: string;
  phraseIndex: number;
  promptId: string;
  metrics: EvaluationMetrics;
  feedback: string;
  specificErrors: SpecificError[];
}

export type PhraseStatus = 'pending' | 'recording' | 'uploading' | 'evaluated' | 'error';

export interface PhraseState {
  phrase: AccentuationPhrase;
  status: PhraseStatus;
  evaluation: PhraseEvaluation | null;
}

export interface AccentuationSessionResult {
  metrics: EvaluationMetrics;
  summaryFeedback: string;
  phraseEvaluations: PhraseEvaluation[];
  timestamp: number;
}
