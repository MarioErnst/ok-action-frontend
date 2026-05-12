export interface FluencyStuckEvent {
  word: string
  count: number
  ctx: string
}

export interface FluencyAnalysis {
  audio_intelligible: boolean
  score: number
  fluency_score: number
  continuity_score: number
  rhythm_score: number
  prompt_alignment_score: number
  coherence_score: number
  classification: string
  stuck_events: FluencyStuckEvent[]
  repetitions: number
  restarts: number
  long_blocks: number
  wpm: number
  pace_feedback: string
  strengths: string[]
  improvement_areas: string[]
  fb: string
}

export type FluencyWarningReason =
  | 'low_fluency_score'
  | 'fluency_blocks_detected'
  | 'time_limit'
  | 'not_aligned_with_prompt'
  | 'audio_not_intelligible'

export type FluencyPhase = 'idle' | 'connecting' | 'recording' | 'ended'

