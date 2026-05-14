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

// Position of one muletilla occurrence inside the root transcript of the
// frame. The frontend uses these to render the filler highlighted on top of
// the transcript when surfacing strike feedback.
export interface FrameMuletillaPositionDto {
  word: string
  start_char: number
  end_char: number
}

export interface FrameMuletillasSectionDto {
  total: number
  detected: FrameMuletillaItemDto[]
  // Optional for compatibility with pre-grounding-hotfix responses. New
  // backend always includes it (possibly empty) for every requested
  // muletillas section.
  muletillas_positions?: FrameMuletillaPositionDto[]
}

// Phoneme error reported by Gemini for one word of the frame transcript.
// Ephemeral: lives only in the HTTP response and feeds both the strike
// counter and the per-word strike feedback rendering.
export interface FramePhonemeErrorDto {
  phoneme: string
  word: string
  actual_issue: string
  suggestion: string
}

export interface FrameAccentuationSectionDto {
  pronunciation_score: number
  rhythm_score: number
  intonation_score: number
  stress_score: number
  prosodic_errors?: FrameProsodicErrorDto[]
}

// Prosodic error reported by Gemini for one word of the frame transcript.
export interface FrameProsodicErrorDto {
  word: string
  expected_stress: string
  actual_issue: string
  suggestion: string
}

export interface FramePronunciationSectionDto {
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  phoneme_errors?: FramePhonemeErrorDto[]
}

export type FrameModuleDto = 'muletillas' | 'accentuation' | 'pronunciation'

export interface FrameEvaluationResponseDto {
  frame_index: number
  evaluated_until_seconds: number
  // Literal transcript of the frame audio. Required by the new backend
  // schema; optional here so legacy responses still type-check during the
  // brief rollout window.
  transcript?: string
  muletillas?: FrameMuletillasSectionDto
  accentuation?: FrameAccentuationSectionDto
  pronunciation?: FramePronunciationSectionDto
}
