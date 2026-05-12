export type PauseClassification = 'pocas pausas' | 'pausas adecuadas' | 'demasiadas pausas';

export type PauseDetectionPhase = 'idle' | 'calibrating' | 'recording' | 'finished';

export interface PauseInterval {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface PauseMetrics {
  totalPauses: number;
  totalPauseDurationMs: number;
  averagePauseMs: number;
  longestPauseMs: number;
  silenceRatio: number;
  classification: PauseClassification;
  pauses: PauseInterval[];
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
  promptText: string;
}
