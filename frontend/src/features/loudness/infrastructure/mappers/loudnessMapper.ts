import type { LoudnessMetrics, LoudnessPreset } from '../../types';
import type { LoudnessPresetDto, SaveLoudnessSessionDto } from '../dto/LoudnessDtos';

export const toSaveLoudnessSessionDto = (
  metrics: LoudnessMetrics,
  presetId: string,
): SaveLoudnessSessionDto => ({
  preset_id: presetId,
  duration_ms: metrics.durationMs,
  optimal_percent: metrics.optimalPercent,
  peak_db: metrics.peakDb,
  band_time_ms: metrics.bandTimeMs as Record<string, number>,
});

export const toLoudnessPreset = (dto: LoudnessPresetDto): LoudnessPreset => ({
  presetId: dto.id,
  label: dto.label,
  description: dto.description ?? '',
  silenceOffsetDb: dto.silence_offset_db,
  tooLowOffsetDb: dto.too_low_offset_db,
  optimalOffsetDb: dto.optimal_offset_db,
  clipThresholdDbfs: dto.clip_threshold_dbfs,
});
