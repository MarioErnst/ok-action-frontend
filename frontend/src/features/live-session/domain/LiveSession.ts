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

// Prosodic error reported by Gemini in live, anchored to a word that must
// appear in the root transcript. Ephemeral: not persisted in DB.
export interface ProsodicError {
  word: string
  expected_stress: string
  actual_issue: string
  suggestion: string
}

export interface AccentuationSection {
  pronunciation_score: number
  rhythm_score: number
  intonation_score: number
  stress_score: number
  prosodic_errors?: ProsodicError[]
  feedback: string
}

// Phoneme error reported by Gemini in live, anchored to a word that must
// appear in the root transcript. Ephemeral: not persisted in DB.
export interface PhonemeError {
  phoneme: string
  word: string
  actual_issue: string
  suggestion: string
}

export interface PronunciationSection {
  vowel_score: number
  consonant_score: number
  fluency_score: number
  intelligibility_score: number
  phoneme_errors?: PhonemeError[]
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
  // Literal transcript of the audio. Required by the backend schema when at
  // least one audio module is selected. Used both as the anti-hallucination
  // contract for Gemini and as the source of truth the UI shows alongside
  // the per-module errors. Optional so legacy responses (pre-hotfix) still
  // parse cleanly.
  transcript?: string
  muletillas?: MuletillasSection
  accentuation?: AccentuationSection
  pronunciation?: PronunciationSection
  facial_expression?: FacialExpressionSection
}
