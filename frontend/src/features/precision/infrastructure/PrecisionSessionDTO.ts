// DTOs for the uniform-schema precision backend. The lifecycle is the
// same (start -> N evaluate -> finalize|abandon) but the shapes changed:
// rounds are now keyed by round_index + prompt_id, the EvaluateRound
// response carries score + four sub-scores + ephemeral feedback fields,
// and the session detail exposes metrics + per-round PrecisionRoundDTO.

export type SessionStatusDTO = 'active' | 'completed' | 'aborted'

export interface PrecisionRoundDTO {
  round_index: number
  prompt_id: string
  score: number | null
  relevance_score: number | null
  directness_score: number | null
  conciseness_score: number | null
  is_audio_intelligible: boolean
}

export interface PrecisionMetricsDTO {
  mode: 'standalone' | 'live'
  rounds_total: number
  rounds_completed: number
  relevance_score: number | null
  directness_score: number | null
  conciseness_score: number | null
}

export interface PrecisionSessionDTO {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  score: number | null
  status: SessionStatusDTO
  created_at: string
  metrics: PrecisionMetricsDTO
  rounds: PrecisionRoundDTO[]
}

export interface PromptOutDTO {
  id: string
  text: string
  category: string
  difficulty: string
}

export interface StartSessionRequestDTO {
  rounds_total: number
  parent_id?: string | null
}

export interface StartSessionDTO {
  session_id: string
  started_at: string
  rounds_total: number
  prompts: PromptOutDTO[]
}

export interface EvaluateRoundDTO {
  round_index: number
  prompt_id: string
  is_audio_intelligible: boolean
  score: number | null
  relevance_score: number | null
  directness_score: number | null
  conciseness_score: number | null
  transcript: string
  feedback: string
  strengths: string[]
  improvement_areas: string[]
}

export interface FinalizeSessionDTO {
  session_id: string
  status: 'completed'
  score: number | null
  rounds_completed: number
  rounds_total: number
  relevance_score: number | null
  directness_score: number | null
  conciseness_score: number | null
}
