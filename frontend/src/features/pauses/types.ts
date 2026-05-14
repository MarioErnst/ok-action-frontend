export type PauseClassification = 'pocas pausas' | 'pausas adecuadas' | 'demasiadas pausas';

// Pause kinds map directly to the silence kinds emitted by the shared
// voiceSegmentation service. We re-export them under domain-aware names so
// the rest of the module reads in pause vocabulary rather than VAD jargon.
export type PauseKind = 'natural' | 'rhetorical' | 'break';

export type PauseDetectionPhase = 'idle' | 'calibrating' | 'recording' | 'finished';

export interface PauseInterval {
  startMs: number;
  endMs: number;
  durationMs: number;
  kind: PauseKind;
}

export interface PauseMetrics {
  totalPauses: number;
  totalPauseDurationMs: number;
  averagePauseMs: number;
  longestPauseMs: number;
  silenceRatio: number;
  classification: PauseClassification;
  pauses: PauseInterval[];
  /** Per-kind counts, useful for feedback ("3 pausas retóricas, 1 ruptura"). */
  naturalCount: number;
  rhetoricalCount: number;
  breakCount: number;
}

export interface PausePrompt {
  id: string;
  text: string;
}

export interface PauseDetectionResult {
  durationMs: number;
  pauseMetrics: PauseMetrics;
  timestamp: number;
}

export interface PauseSessionResult extends PauseDetectionResult {
  promptId: string;
  promptText: string;
}
