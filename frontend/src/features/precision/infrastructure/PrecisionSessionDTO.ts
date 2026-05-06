export interface PrecisionRoundDTO {
  id: string
  question_text: string
  relevance_score: number | null
  directness_score: number | null
  conciseness_score: number | null
  overall_score: number | null
  feedback: string | null
  strengths: string[] | null
  improvement_areas: string[] | null
  noise_level: string
  audio_intelligible: boolean
  created_at: string
}

export interface PrecisionSessionDTO {
  id: string
  mode: string
  total_rounds: number
  completed_rounds: number
  overall_score: number | null
  status: string
  created_at: string
  rounds: PrecisionRoundDTO[]
}

export interface StartSessionDTO {
  session_id: string
  questions: Array<{
    id: string
    text: string
    category: string
    difficulty_level: string
  }>
  total_rounds: number
}

export interface EvaluateRoundDTO {
  round_id: string
  audio_intelligible: boolean
  relevance_score: number | null
  directness_score: number | null
  conciseness_score: number | null
  overall_score: number | null
  feedback: string | null
  strengths: string[] | null
  improvement_areas: string[] | null
}

export interface FinalizeSessionDTO {
  session_id: string
  overall_score: number | null
  completed_rounds: number
  status: string
}
