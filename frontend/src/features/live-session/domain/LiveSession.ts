// Domain types for the new HTTP composition live session.
// The four modules below match exactly the backend's ComposableModule
// literal: changing one without the other breaks the contract.
export type LiveModule =
  | 'muletillas'
  | 'accentuation'
  | 'pronunciation'
  | 'consistency'

export const LIVE_MODULES: readonly LiveModule[] = [
  'muletillas',
  'accentuation',
  'pronunciation',
  'consistency',
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

export interface ConsistencySection {
  consistency_score: number
  volatility_count: number
  active_pct: number
  feedback: string
}

// Whole Gemini composed response. Sections are present only for modules
// that were requested. audio_intelligible is always present.
export interface ComposedEvaluation {
  audio_intelligible: boolean
  muletillas?: MuletillasSection
  accentuation?: AccentuationSection
  pronunciation?: PronunciationSection
  consistency?: ConsistencySection
}
