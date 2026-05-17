// One discrete event that contributed to the strike counter during a
// live session. The hooks aggregate StrikeEvent[] both for the counter
// and for the post-stop feedback screen, where they appear in the
// strike timeline and the muletillas detail panel.
//
// Today the only kind the live pipeline emits is `muletilla` —
// pronunciation and accentuation moved to composed-eval at session
// end. The discriminated union is kept (as a single-variant literal)
// so re-introducing other live kinds in the future is a type-level
// change rather than a refactor.

export type StrikeKind = 'muletilla'

export type StrikeSeverity = 'low' | 'medium' | 'high'

export interface StrikeEvent {
  kind: StrikeKind
  // Milliseconds from the recording start to the event.
  timestampMs: number
  // Short human-readable detail used by the feedback page list rows.
  // Today contains the surrounding transcript snippet from AssemblyAI.
  detail: string
  // Severity reported by the backend. Today always `low`; the field is
  // kept for forward compatibility with future heuristics.
  severity?: StrikeSeverity
  // The literal filler word the matcher found (e.g. "eh", "o sea").
  word?: string
}
