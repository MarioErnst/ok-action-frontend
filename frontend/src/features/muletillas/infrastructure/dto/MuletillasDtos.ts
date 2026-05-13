// DTOs for the uniform-schema muletillas backend. Severity flows
// untranslated as English low/medium/high (the Gemini prompt now returns
// those values directly). The /evaluate response stays per-recording and
// ephemeral; the /sessions endpoints persist only the four metrics
// columns plus the per-word usage rows.

export type SessionStatusDto = 'active' | 'completed' | 'aborted'

export type MuletillaSeverityDto = 'low' | 'medium' | 'high'

export type MuletillaDetectedEphemeralDto = {
  word: string
  count: number
  severity: MuletillaSeverityDto
  suggestion: string
}

export type MuletillaPositionDto = {
  word: string
  start_char: number
  end_char: number
}

export type MuletillasEvaluationDto = {
  overall_score: number
  fluency_score: number
  muletillas_score: number
  total_muletillas_count: number
  muletillas_per_minute: number
  muletillas_detected: MuletillaDetectedEphemeralDto[]
  // Ephemeral transcript + positions emitted by Gemini so the UI can
  // highlight every filler occurrence inline. Optional because legacy
  // responses (before the prompt update) may not include them.
  transcript?: string | null
  muletillas_positions?: MuletillaPositionDto[]
  feedback: string
  strengths: string
  improvement_areas: string
}

export type MuletillaWordDto = {
  word: string
  count: number
  severity: MuletillaSeverityDto
}

export type MuletillaWordOutDto = MuletillaWordDto

export type MuletillasMetricsInputDto = {
  fluency_score: number
  words: MuletillaWordDto[]
}

export type MuletillasMetricsOutDto = {
  fluency_score: number
  muletillas_count: number
}

export type SaveMuletillasSessionDto = {
  started_at: string
  ended_at: string
  metrics: MuletillasMetricsInputDto
  parent_id?: string | null
}

export type MuletillasSessionDto = {
  id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_ms: number
  score: number
  status: SessionStatusDto
  created_at: string
  metrics: MuletillasMetricsOutDto
  words: MuletillaWordOutDto[]
}

export type MuletillasSessionListItemDto = {
  id: string
  started_at: string
  ended_at: string
  duration_ms: number
  score: number
  status: SessionStatusDto
  muletillas_count: number
  fluency_score: number
}

export type RandomQuestionDto = {
  question: string
}
