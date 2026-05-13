// Aggregates the shared voiceSegmentation primitives into the three new
// phonation-level metrics persisted in `phonation_session_exercises`:
//
//   - `maxSustainedVoicingMs`: longest uninterrupted voiced segment. Natural
//     pauses do not reset it — they delimit segments. Best proxy for breath
//     support that does not penalise good rhythm.
//   - `dbSlopeDbPerSec`: average slope of dB across all voiced segments.
//     Negative = fades as the exercise progresses; near zero = stable.
//   - `weakPhraseEndingsCount`: number of voiced segments whose last frame is
//     noticeably quieter than their first (>5 dB difference). Captures the
//     "se queda sin aire al final de la frase" pattern.
//
// The phonation worklet keeps emitting raw frames; the segmentation and these
// aggregates run main-thread once the exercise finishes, sharing the same
// VAD logic as Pausas.

import {
  segmentVoiceFrames,
  type SegmentationContext,
  type VoicedSegment,
} from '../../../shared/services/voiceSegmentation';
import type { PhonationFrame } from '../domain/PhonationSession';

export interface ExtendedPhonationMetrics {
  maxSustainedVoicingMs: number;
  dbSlopeDbPerSec: number;
  weakPhraseEndingsCount: number;
}

const DEFAULT_SILENCE_OFFSET_DB = 6;
const WEAK_ENDING_DB_DROP = 5;

export interface ExtendedMetricsOptions {
  noiseFloorDb: number;
  totalDurationMs: number;
  /** `speech` (default) for phrase exercises, `sustained` for sostenida/glissando. */
  context?: SegmentationContext;
}

export function computeExtendedPhonationMetrics(
  frames: PhonationFrame[],
  options: ExtendedMetricsOptions,
): ExtendedPhonationMetrics {
  if (frames.length === 0 || options.totalDurationMs <= 0) {
    return emptyMetrics();
  }

  const { voicedSegments } = segmentVoiceFrames(frames, {
    noiseFloorDb: options.noiseFloorDb,
    silenceOffsetDb: DEFAULT_SILENCE_OFFSET_DB,
    totalDurationMs: options.totalDurationMs,
    context: options.context ?? 'speech',
  });

  if (voicedSegments.length === 0) return emptyMetrics();

  const maxSustainedVoicingMs = voicedSegments.reduce(
    (longest, segment) => Math.max(longest, segment.durationMs),
    0,
  );

  const weakPhraseEndingsCount = voicedSegments.filter(
    (segment) => segment.startDb - segment.endDb > WEAK_ENDING_DB_DROP,
  ).length;

  const dbSlopeDbPerSec = averageSegmentSlope(voicedSegments);

  return {
    maxSustainedVoicingMs,
    dbSlopeDbPerSec,
    weakPhraseEndingsCount,
  };
}

function averageSegmentSlope(segments: VoicedSegment[]): number {
  // Weighted average so short blips don't dominate longer phrases.
  let weightedSlopeSum = 0;
  let totalWeight = 0;
  for (const segment of segments) {
    if (segment.durationMs <= 0) continue;
    const slopePerSec = ((segment.endDb - segment.startDb) * 1000) / segment.durationMs;
    weightedSlopeSum += slopePerSec * segment.durationMs;
    totalWeight += segment.durationMs;
  }
  if (totalWeight === 0) return 0;
  // Round to 3 decimals to match the NUMERIC(6,3) backend column.
  return Number((weightedSlopeSum / totalWeight).toFixed(3));
}

function emptyMetrics(): ExtendedPhonationMetrics {
  return {
    maxSustainedVoicingMs: 0,
    dbSlopeDbPerSec: 0,
    weakPhraseEndingsCount: 0,
  };
}
