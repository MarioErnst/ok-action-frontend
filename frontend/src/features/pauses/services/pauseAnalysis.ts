import type { PhonationFrame } from '../../phonation/domain/PhonationSession';
import {
  segmentVoiceFrames,
  type SilenceSegment,
} from '../../../shared/services/voiceSegmentation';
import type { PauseClassification, PauseInterval, PauseKind, PauseMetrics } from '../types';

export interface PauseAnalysisConfig {
  silenceOffsetDb: number;
  minPauseMs: number;
  mergeGapMs: number;
}

// 500ms minimum keeps the result faithful to spoken pause perception: shorter
// gaps read as articulation, not pauses. mergeGapMs absorbs micro-spikes back
// into voiced segments to avoid false positives.
export const DEFAULT_PAUSE_ANALYSIS_CONFIG: PauseAnalysisConfig = {
  silenceOffsetDb: 6,
  minPauseMs: 500,
  mergeGapMs: 150,
};

function createEmptyMetrics(): PauseMetrics {
  return {
    totalPauses: 0,
    totalPauseDurationMs: 0,
    averagePauseMs: 0,
    longestPauseMs: 0,
    silenceRatio: 0,
    classification: 'pocas pausas',
    pauses: [],
    naturalCount: 0,
    rhetoricalCount: 0,
    breakCount: 0,
  };
}

export function classifyPauseMetrics(
  totalPauses: number,
  silenceRatio: number,
): PauseClassification {
  if (totalPauses === 0 || silenceRatio < 0.08) return 'pocas pausas';
  if (silenceRatio > 0.35) return 'demasiadas pausas';
  return 'pausas adecuadas';
}

// VAD silences shorter than the rhetorical band are noise to the Pausas
// module (they are articulatory or breath-level). Drop them; surface only
// pauses that the user perceives as such.
const REPORTABLE_KINDS: ReadonlyArray<SilenceSegment['kind']> = [
  'natural',
  'rhetorical',
  'break',
];

export function analyzePauseFrames(
  frames: PhonationFrame[],
  noiseFloor: number,
  durationMs: number,
  config: PauseAnalysisConfig = DEFAULT_PAUSE_ANALYSIS_CONFIG,
): PauseMetrics {
  const totalDurationMs = Math.max(0, Math.round(durationMs));
  if (frames.length === 0 || totalDurationMs === 0) return createEmptyMetrics();

  const { silences } = segmentVoiceFrames(frames, {
    noiseFloorDb: noiseFloor,
    silenceOffsetDb: config.silenceOffsetDb,
    totalDurationMs,
    mergeGapMs: config.mergeGapMs,
    minSilenceMs: config.minPauseMs,
    context: 'speech',
  });

  const reportable = silences.filter((silence) => REPORTABLE_KINDS.includes(silence.kind));

  const pauses: PauseInterval[] = reportable.map((silence) => ({
    startMs: silence.startMs,
    endMs: silence.endMs,
    durationMs: silence.durationMs,
    kind: silence.kind as PauseKind,
  }));

  const totalPauseDurationMs = pauses.reduce((sum, p) => sum + p.durationMs, 0);
  const totalPauses = pauses.length;
  const averagePauseMs = totalPauses > 0 ? Math.round(totalPauseDurationMs / totalPauses) : 0;
  const longestPauseMs = pauses.reduce((longest, p) => Math.max(longest, p.durationMs), 0);
  const silenceRatio = Number((totalPauseDurationMs / totalDurationMs).toFixed(4));

  const naturalCount = pauses.filter((p) => p.kind === 'natural').length;
  const rhetoricalCount = pauses.filter((p) => p.kind === 'rhetorical').length;
  const breakCount = pauses.filter((p) => p.kind === 'break').length;

  return {
    totalPauses,
    totalPauseDurationMs,
    averagePauseMs,
    longestPauseMs,
    silenceRatio,
    classification: classifyPauseMetrics(totalPauses, silenceRatio),
    pauses,
    naturalCount,
    rhetoricalCount,
    breakCount,
  };
}
