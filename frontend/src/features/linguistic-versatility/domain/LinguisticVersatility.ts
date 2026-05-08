// 1=básico, 2=intermedio, 3=avanzado. Numeric on the wire to keep the
// backend allow-list and the frontend types in lockstep.
export type RichnessLevel = 1 | 2 | 3

export type SessionMode = 'guided' | 'free'

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface VersatilityQuestion {
  id: string
  text: string
  category: string
  difficulty_level: string
}

export interface RoundResult {
  id: string
  question_id: string | null
  question_text: string | null
  versatility_score: number | null
  vocabulary_richness: RichnessLevel | null
  feedback: string | null
  audio_intelligible: boolean
  created_at: string
}

export interface SessionDetail {
  id: string
  mode: SessionMode
  total_rounds: number
  completed_rounds: number
  overall_score: number | null
  status: SessionStatus
  created_at: string
  completed_at: string | null
  rounds: RoundResult[]
}

export interface StartSessionResponse {
  session_id: string
  total_rounds: number
  questions: VersatilityQuestion[]
}

export interface EvaluateRoundResponse {
  round_id: string
  audio_intelligible: boolean
  versatility_score: number | null
  vocabulary_richness: RichnessLevel | null
  feedback: string | null
  completed_rounds: number
  total_rounds: number
}

export interface SessionListItem {
  id: string
  mode: SessionMode
  overall_score: number | null
  status: SessionStatus
  created_at: string
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
