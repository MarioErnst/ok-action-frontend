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
  // Silence detection: relative to calibrated noise floor
  silenceOffsetDb: number;
  // Voice quality zones: absolute dBFS (independent of noise floor)
  tooLowCeilingDbfs: number;
  optimalCeilingDbfs: number;
  clipThresholdDbfs: number;
}

export interface LoudnessMetrics {
  durationMs: number;
  bandTimeMs: Record<LoudnessBand, number>;
  optimalPercent: number;
  peakDb: number;
}

export interface LoudnessPreset {
  presetId: string;
  label: string;
  description: string;
  silenceOffsetDb: number;
  lowOffsetDb: number;
  optimalOffsetDb: number;
  clipThresholdDb: number;
  isDefault: boolean;
  isGlobal: boolean;
}

export type CalibrationPhase = 'idle' | 'noise' | 'voice' | 'active';
