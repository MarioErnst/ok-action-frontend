// Vocabulary richness moved from the legacy 1/2/3 categorical to a 0-100
// integer that matches the backend's SMALLINT column. The Gemini prompt
// returns it on the same scale; the UI buckets display labels by range
// instead of by enum value.
export type RichnessScore = number

export type SessionMode = 'guided' | 'free'

export type SessionStatus = 'active' | 'completed' | 'aborted'

export interface VersatilityQuestion {
  id: string
  text: string
  category: string
  difficulty: string
}

export interface RoundResult {
  // Composite identity from the backend's PK (session_id, round_index).
  roundIndex: number
  promptId: string | null
  questionText: string | null
  versatilityScore: number | null
  vocabularyRichness: RichnessScore | null
  feedback: string | null
  audioIntelligible: boolean
}

export interface SessionDetail {
  id: string
  mode: SessionMode
  totalRounds: number
  completedRounds: number
  overallScore: number | null
  vocabularyRichnessAvg: RichnessScore | null
  status: SessionStatus
  createdAt: string
  completedAt: string | null
  rounds: RoundResult[]
}

export interface StartSessionResponse {
  sessionId: string
  totalRounds: number
  questions: VersatilityQuestion[]
}

export interface EvaluateRoundResponse {
  roundIndex: number
  promptId: string | null
  audioIntelligible: boolean
  versatilityScore: number | null
  vocabularyRichness: RichnessScore | null
  feedback: string | null
}

export interface SessionListItem {
  id: string
  mode: SessionMode
  overallScore: number | null
  status: SessionStatus
  createdAt: string
}

// State machine for the guided flow.
export type GuidedStatus =
  | 'idle'
  | 'loading'
  | 'recording'
  | 'uploading'
  | 'review'
  | 'finalizing'
  | 'results'
  | 'error'
