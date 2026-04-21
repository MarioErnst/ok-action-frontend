export type { LoudnessBand, LoudnessConfig, LoudnessMetrics } from './types';
export { classifyLoudness } from './services/loudnessClassifier';
export { LOUDNESS_PRESETS, getPresetById } from './services/loudnessPresets';
export { default as useLoudnessCoach } from './hooks/useLoudnessCoach';