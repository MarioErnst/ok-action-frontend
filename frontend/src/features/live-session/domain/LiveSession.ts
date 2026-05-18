// Domain types for the HTTP composition live session.
// The four modules below match exactly the backend's ComposableModule
// literal: changing one without the other breaks the contract.
// phonation and loudness are client-side modules whose data is
// computed in the browser via the AudioWorklet pitch/dB pipeline and
// submitted as phonation_summary / loudness_summary alongside the
// audio in the composed evaluation request. facial_expression follows
// the same pattern with its own payload.
export type LiveModule =
  | 'muletillas'
  | 'phonation'
  | 'loudness'
  | 'facial_expression'

export const LIVE_MODULES: readonly LiveModule[] = [
  'muletillas',
  'phonation',
  'loudness',
  'facial_expression',
] as const

// UI phases of a live session run. Calibrating measures the noise floor
// while the user stays silent, recording captures audio + frames +
// optional emotion classifier, stopped_transition is the brief
// cushioning overlay between an auto-stop and the rich feedback page,
// stopped_feedback is the post-auto-stop feedback page itself,
// evaluating waits for the composed Gemini call, summary shows the
// natural-completion per-module results, and error is a terminal state
// (the user goes back to selection).
export type LiveSessionPhase =
  | 'selection'
  | 'calibrating'
  | 'recording'
  | 'evaluating'
  | 'summary'
  | 'stopped_transition'
  | 'stopped_feedback'
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

// Position of one muletilla occurrence inside the root transcript. Anchored:
// transcript[start_char:end_char] should equal the muletilla. The frontend
// validates this contract before rendering the highlight; if it does not
// match it falls back to indexOf or hides the highlight.
export interface MuletillaPosition {
  word: string
  start_char: number
  end_char: number
}

export interface MuletillasSection {
  fluency_score: number
  total_muletillas: number
  detected: MuletillasDetectedItem[]
  // Optional for backwards compatibility with responses from before the
  // grounding hotfix. New backend always includes them when at least one
  // audio module is selected.
  muletillas_positions?: MuletillaPosition[]
  feedback: string
}

// Phonation summary computed in the browser from the AudioWorklet pitch
// frames. Submitted alongside the audio as `phonation_summary`. Mirrors
// the columns of phonation_metrics.
export interface PhonationSection {
  avg_hz: number
  stability_score: number
  breaks_count: number
}

// Loudness summary computed in the browser from the per-frame band
// classifier. Submitted alongside the audio as `loudness_summary`.
// preset_id identifies which preset's thresholds were used; mirrors
// the columns of loudness_metrics.
export interface LoudnessSection {
  preset_id: string
  optimal_pct: number
  low_pct: number
  high_pct: number
  clipping_pct: number
  peak_db: number
  noise_floor_db?: number | null
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
  // Literal transcript of the audio. Required by the backend schema when at
  // least one audio module is selected. Used both as the anti-hallucination
  // contract for Gemini and as the source of truth the UI shows alongside
  // the per-module errors. Optional so legacy responses (pre-hotfix) still
  // parse cleanly.
  transcript?: string
  muletillas?: MuletillasSection
  phonation?: PhonationSection
  loudness?: LoudnessSection
  facial_expression?: FacialExpressionSection
}
