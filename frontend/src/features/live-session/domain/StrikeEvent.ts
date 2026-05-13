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
  detail: string
  // For muletillas: severity reported by Gemini. Undefined for
  // accentuation/pronunciation events which are score-threshold based.
  severity?: StrikeSeverity
  // For muletillas: the offending word. Undefined for score-threshold
  // events.
  word?: string
}
