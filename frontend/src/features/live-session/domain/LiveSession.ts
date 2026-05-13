// Domain types for the HTTP composition live session.
// The four modules below match exactly the backend's ComposableModule
// literal: changing one without the other breaks the contract.
// facial_expression replaced consistency: facial data does not come from
// Gemini's audio evaluation; it is computed in the browser from the
// emotion classifier stream and submitted alongside the audio as
// facial_summary in the composed evaluation request.
export type LiveModule =
  | 'muletillas'
  | 'accentuation'
  | 'pronunciation'
  | 'facial_expression'

export const LIVE_MODULES: readonly LiveModule[] = [
  'muletillas',
  'accentuation',
  'pronunciation',
  'facial_expression',
] as const

// UI phases of a live session run. Selection is the initial picker, then
// recording captures audio with MediaRecorder, evaluating waits for the
// composed Gemini call, summary shows per-module results, and error is a
// terminal state (the user goes back to selection).
export type LiveSessionPhase =
  | 'selection'
  | 'recording'
  | 'evaluating'
  | 'summary'
  | 'error'

// Per-module result sections inside the Gemini composed response. Field
// names mirror the backend schemas in
// app/use_cases/live/composed/schemas.py — keeping them aligned avoids a
// mapping layer for the summary screen.

export interface MuletillasDetectedItem {
  word: string
  count: number
  severity: string
  suggestion: string
}

export interface MuletillasSection {
  fluency_score: number
  total_muletillas: number
  detected: MuletillasDetectedItem[]
  feedback: string
}

export interface AccentuationSection {
  pronunciation_score: number
  rhythm_score: number
  intonation_score: number
  stress_score: number
  feedback: string
}

export interface PronunciationSection {
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  feedback: string
}

// Facial expression section is computed in the browser from the emotion
// classifier stream and joined onto the evaluation object client-side so
// the summary screen renders consistently across modules. The shape
// mirrors the backend FacialSummaryInput payload submitted to the
// composed evaluation endpoint (and the columns of
// facial_expression_metrics).
export type FacialEmotionName =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'fearful'
  | 'disgusted'
  | 'neutral'

export interface FacialExpressionSection {
  expressiveness_score: number
  top_emotion: FacialEmotionName
  happy_pct: number
  sad_pct: number
  angry_pct: number
  surprised_pct: number
  fearful_pct: number
  disgusted_pct: number
  neutral_pct: number
}

// Whole composed evaluation as it lands on the summary screen. The audio
// sections come from Gemini's response; facial_expression is attached
// client-side after computing it from the emotion classifier stream.
export interface ComposedEvaluation {
  audio_intelligible: boolean
  muletillas?: MuletillasSection
  accentuation?: AccentuationSection
  pronunciation?: PronunciationSection
  facial_expression?: FacialExpressionSection
}
