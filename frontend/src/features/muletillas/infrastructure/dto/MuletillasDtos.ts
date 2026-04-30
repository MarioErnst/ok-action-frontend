export type MuletillaDetectedDto = {
  word: string
  count: number
  severity: string
  suggestion: string
}

export type MuletillasEvaluationDto = {
  overall_score: number
  fluency_score: number
  muletillas_score: number
  total_muletillas_count: number
  muletillas_per_minute: number
  muletillas_detected: MuletillaDetectedDto[]
  feedback: string
  strengths: string
  improvement_areas: string
}

export type MuletillasSessionDto = MuletillasEvaluationDto & {
  id: string
  question_text: string
  created_at: string
}

export type MuletillasSessionListItemDto = {
  id: string
  question_text: string
  overall_score: number
  total_muletillas_count: number
  created_at: string
}

export type SaveMuletillasSessionDto = {
  question_text: string
  overall_score: number
  fluency_score: number
  muletillas_score: number
  total_muletillas_count: number
  muletillas_per_minute: number
  feedback: string
  strengths: string
  improvement_areas: string
  muletillas_detected: MuletillaDetectedDto[]
}

export type RandomQuestionDto = {
  question: string
}
