import type { LoudnessBand, LoudnessConfig } from '../types';

const SILENCE_MARGIN_DB = 6;

export function classifyLoudness(
  db: number,
  noiseFloor: number,
  config: LoudnessConfig,
): LoudnessBand {
  if (db >= config.clipThresholdDbfs) {
    return 'clipping';
  }

  if (db < noiseFloor + SILENCE_MARGIN_DB) {
    return 'silence';
  }

  if (db >= noiseFloor + config.maxOffsetDb) {
    return 'too-high';
  }

  if (db >= noiseFloor + config.minOffsetDb) {
    return 'optimal';
  }

  return 'too-low';
}
