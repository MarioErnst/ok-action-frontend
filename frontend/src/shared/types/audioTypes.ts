// Generic audio frame produced by the voice monitor worklet.
// Kept in shared/ because multiple features (loudness, phonation) consume it.
export interface AudioFrame {
  hz: number | null;
  db: number;
  timestamp: number;
}
