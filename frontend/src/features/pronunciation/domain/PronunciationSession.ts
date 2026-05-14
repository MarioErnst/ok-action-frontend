export type PronunciationLevel = 'basico' | 'intermedio' | 'avanzado'

export interface PronunciationPhrase {
  id: string
  text: string
  level: PronunciationLevel
}

export interface PhonemeError {
  phoneme: string
  word: string
  actualIssue: string
  suggestion: string
}

export interface PronunciationMetrics {
  overallScore: number
  vowelScore: number
  consonantScore: number
  fluencyScore: number
  intelligibilityScore: number
}

export interface PhrasePronunciation {
  phraseText: string
  phraseIndex: number
  promptId: string
  metrics: PronunciationMetrics
  feedback: string
  phonemeErrors: PhonemeError[]
}

export type PhraseStatus = 'pending' | 'recording' | 'uploading' | 'evaluated' | 'error'

export interface PhraseState {
  phrase: PronunciationPhrase
  status: PhraseStatus
  evaluation: PhrasePronunciation | null
}

export interface PronunciationSessionResult {
  level: PronunciationLevel
  metrics: PronunciationMetrics
  summaryFeedback: string
  phraseEvaluations: PhrasePronunciation[]
  timestamp: number
}