import type { LoudnessMetrics, LoudnessPreset } from '../../domain/LoudnessSession';
import type { LoudnessPresetDto, SaveLoudnessSessionDto } from '../dto/LoudnessDtos';

// The backend asserts the four band percentages sum to exactly 100, so the
// caller cannot just round each independently. We use largest-remainder
// rounding to absorb the rounding error into whichever band has the
// largest fractional part.
const normalizeBandPercentages = (
  raw: { optimal: number; low: number; high: number; clipping: number },
): { optimal: number; low: number; high: number; clipping: number } => {
  const entries: [keyof typeof raw, number][] = [
    ['optimal', raw.optimal],
    ['low', raw.low],
    ['high', raw.high],
    ['clipping', raw.clipping],
  ];
  const floored = entries.map(([k, v]) => [k, Math.floor(v), v - Math.floor(v)] as const);
  let total = floored.reduce((acc, [, f]) => acc + f, 0);
  const result = { optimal: 0, low: 0, high: 0, clipping: 0 };
  for (const [k, f] of floored) {
    result[k] = f;
  }
  // Distribute remaining points to entries with the largest fractional parts.
  const sorted = [...floored].sort((a, b) => b[2] - a[2]);
  let i = 0;
  while (total < 100) {
    const [k] = sorted[i % sorted.length];
    result[k] += 1;
    total += 1;
    i += 1;
  }
  return result;
};

export const toSaveLoudnessSessionDto = (
  metrics: LoudnessMetrics,
  presetId: string,
  parentId?: string | null,
): SaveLoudnessSessionDto => {
  // Frontend tracks per-band time including silence; the backend metric
  // shape only stores the four expressive bands. We discard silence and
  // normalize the remainder to a percentage that sums to 100.
  const bands = metrics.bandTimeMs;
  const activeMs =
    bands['too-low'] + bands.optimal + bands['too-high'] + bands.clipping;

  const raw =
    activeMs > 0
      ? {
          optimal: (bands.optimal / activeMs) * 100,
          low: (bands['too-low'] / activeMs) * 100,
          high: (bands['too-high'] / activeMs) * 100,
          clipping: (bands.clipping / activeMs) * 100,
        }
      : { optimal: 0, low: 0, high: 0, clipping: 0 };

  const normalized = activeMs > 0
    ? normalizeBandPercentages(raw)
    : { optimal: 0, low: 0, high: 0, clipping: 100 };

  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - metrics.durationMs);

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    metrics: {
      preset_id: presetId,
      optimal_pct: normalized.optimal,
      low_pct: normalized.low,
      high_pct: normalized.high,
      clipping_pct: normalized.clipping,
      peak_db: metrics.peakDb,
    },
    parent_id: parentId ?? null,
  };
};

export const toLoudnessPreset = (dto: LoudnessPresetDto): LoudnessPreset => ({
  presetId: dto.id,
  label: dto.label,
  description: dto.description ?? '',
  silenceOffsetDb: dto.silence_offset_db,
  lowOffsetDb: dto.low_offset_db,
  optimalOffsetDb: dto.optimal_offset_db,
  clipThresholdDb: dto.clip_threshold_db,
  isDefault: dto.is_default,
  isGlobal: dto.is_global,
});
