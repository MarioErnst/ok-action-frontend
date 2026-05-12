import type { LoudnessConfig, LoudnessPreset } from '../domain/LoudnessSession';

const VOICE_GUARD_DB = 10;

export function computeEffectiveConfig(
  preset: LoudnessPreset,
  voiceBaseline: number,
): LoudnessConfig {
  return {
    presetId: preset.presetId,
    label: preset.label,
    description: preset.description,
    silenceOffsetDb: preset.silenceOffsetDb,
    tooLowCeilingDbfs: voiceBaseline + preset.lowOffsetDb,
    optimalCeilingDbfs: voiceBaseline + preset.optimalOffsetDb,
    clipThresholdDbfs: preset.clipThresholdDb,
  };
}

export function computeVoiceBaseline(samples: number[], noiseFloor: number): number | null {
  const voiceSamples = samples.filter((db) => db > noiseFloor + VOICE_GUARD_DB);

  if (voiceSamples.length === 0) {
    return null;
  }

  const sorted = [...voiceSamples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}