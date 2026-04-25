type PronunciationLevel = 'basico' | 'intermedio' | 'avanzado'

interface PronunciationPhrase {
  id: string
  text: string
  level: PronunciationLevel
}

interface PhonemeError {
  phoneme: string
  word: string
  actualIssue: string
  suggestion: string
}

interface PronunciationMetrics {
  overallScore: number
  vowelScore: number
  consonantScore: number
  fluencyScore: number
  intelligibilityScore: number
}

interface PhrasePronunciation {
  phraseText: string
  phraseIndex: number
  metrics: PronunciationMetrics
  feedback: string
  phonemeErrors: PhonemeError[]
}

type PhraseStatus = 'pending' | 'recording' | 'uploading' | 'evaluated' | 'error'

interface PhraseState {
  phrase: PronunciationPhrase
  status: PhraseStatus
  evaluation: PhrasePronunciation | null
}

interface PronunciationSessionResult {
  level: PronunciationLevel
  metrics: PronunciationMetrics
  summaryFeedback: string
  phraseEvaluations: PhrasePronunciation[]
  timestamp: number
}
