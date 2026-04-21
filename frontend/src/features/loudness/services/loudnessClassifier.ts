import type { LoudnessBand, LoudnessConfig } from '../types';

export function classifyLoudness(
  db: number,
  noiseFloor: number,
  config: LoudnessConfig,
): LoudnessBand {
  if (db >= config.clipThresholdDbfs) return 'clipping';

  // Silence detection is relative: adapts to the calibrated room noise level
  if (db < noiseFloor + config.silenceOffsetDb) return 'silence';

  // Quality zones are absolute: consistent across rooms and mic sensitivities
  if (db >= config.optimalCeilingDbfs) return 'too-high';
  if (db >= config.tooLowCeilingDbfs) return 'optimal';

  return 'too-low';
}
