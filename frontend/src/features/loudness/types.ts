export type LoudnessBand =
  | 'silence'
  | 'too-low'
  | 'optimal'
  | 'too-high'
  | 'clipping';

export interface LoudnessConfig {
  presetId: string;
  label: string;
  description: string;
  minOffsetDb: number;
  maxOffsetDb: number;
  clipThresholdDbfs: number;
}

export interface LoudnessMetrics {
  durationMs: number;
  bandTimeMs: Record<LoudnessBand, number>;
  optimalPercent: number;
  peakDb: number;
}
