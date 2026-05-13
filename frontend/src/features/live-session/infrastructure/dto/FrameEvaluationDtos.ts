// DTOs for the per-frame evaluation pipeline.
// Mirror app/presentation/schemas/live.py:FrameEvaluationResponse on the
// backend. facial_expression is intentionally absent: facial is computed
// in the browser and never goes through this endpoint.

export type FrameMuletillaSeverityDto = 'low' | 'medium' | 'high'

export interface FrameMuletillaItemDto {
  word: string
  count: number
  severity: FrameMuletillaSeverityDto
  timestamp_ms: number
}

export interface FrameMuletillasSectionDto {
  total: number
  detected: FrameMuletillaItemDto[]
}

export interface FrameAccentuationSectionDto {
  pronunciation_score: number
  rhythm_score: number
  intonation_score: number
  stress_score: number
}

export interface FramePronunciationSectionDto {
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
}

export type FrameModuleDto = 'muletillas' | 'accentuation' | 'pronunciation'

export interface FrameEvaluationResponseDto {
  frame_index: number
  evaluated_until_seconds: number
  muletillas?: FrameMuletillasSectionDto
  accentuation?: FrameAccentuationSectionDto
  pronunciation?: FramePronunciationSectionDto
}
