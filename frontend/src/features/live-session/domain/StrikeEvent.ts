// One discrete event that contributed to the strike counter during a
// live session. The hooks aggregate StrikeEvent[] both for the counter
// and for the post-stop feedback screen, where they appear grouped by
// module with timestamps for the audio player markers.

export type StrikeKind = 'muletilla' | 'accentuation' | 'pronunciation'

export type StrikeSeverity = 'low' | 'medium' | 'high'

export interface StrikeEvent {
  kind: StrikeKind
  // Index of the audio frame the event was found in. Multiple events
  // can share the same frame (e.g., several muletillas in one frame).
  frameIndex: number
  // Milliseconds from the recording start to the event.
  timestampMs: number
  // Short human-readable detail used by the feedback page list rows.
  // For muletillas: still describes the filler.
  // For accentuation/pronunciation since the grounding hotfix: contains
  // the per-word context produced by Gemini's prosodic/phoneme error item.
  detail: string
  // For muletillas: severity reported by Gemini. Undefined for
  // accentuation/pronunciation events.
  severity?: StrikeSeverity
  // The word that triggered the strike. Populated for all kinds since the
  // grounding hotfix (muletilla word, mispronounced word, misaccentuated
  // word). The strike counter deduplicates pronunciation/accentuation
  // events by this word so the same mistake repeated across frames counts
  // only once.
  word?: string
  // Pronunciation-only: the phoneme reported as problematic.
  phoneme?: string
  // Accentuation-only: how the word should have been stressed/intoned,
  // as reported by Gemini (for example "PA-ja-ro").
  expectedStress?: string
  // Free-form summary of how the user actually pronounced/accentuated the
  // word. One short line.
  actualIssue?: string
  // Actionable correction, one short line. Rendered in the strike
  // feedback panel below the word.
  suggestion?: string
}
