import type { PhonationFrame } from '../../phonation/domain/PhonationSession';
import type { PauseClassification, PauseInterval, PauseMetrics } from '../types';

export interface PauseAnalysisConfig {
  silenceOffsetDb: number;
  minPauseMs: number;
  mergeGapMs: number;
}

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

function mergeClosePauses(pauses: PauseInterval[], mergeGapMs: number): PauseInterval[] {
  const merged: PauseInterval[] = [];

  for (const pause of pauses) {
    const previous = merged[merged.length - 1];

    if (!previous || pause.startMs - previous.endMs > mergeGapMs) {
      merged.push({ ...pause });
      continue;
    }

    previous.endMs = Math.max(previous.endMs, pause.endMs);
    previous.durationMs = previous.endMs - previous.startMs;
  }

  return merged;
}

export function analyzePauseFrames(
  frames: PhonationFrame[],
  noiseFloor: number,
  durationMs: number,
  config: PauseAnalysisConfig = DEFAULT_PAUSE_ANALYSIS_CONFIG,
): PauseMetrics {
  const totalDurationMs = Math.max(0, Math.round(durationMs));
  if (frames.length === 0 || totalDurationMs === 0) return createEmptyMetrics();

  const orderedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  const sessionStart = orderedFrames[0].timestamp;
  const sessionEnd = sessionStart + totalDurationMs;
  const silenceThresholdDb = noiseFloor + config.silenceOffsetDb;

  const rawPauses: PauseInterval[] = [];
  let currentPauseStart: number | null = null;

  for (const frame of orderedFrames) {
    if (frame.timestamp < sessionStart || frame.timestamp > sessionEnd) continue;

    const isSilent = frame.db < silenceThresholdDb;

    if (isSilent && currentPauseStart === null) {
      currentPauseStart = frame.timestamp;
      continue;
    }

    if (!isSilent && currentPauseStart !== null) {
      const startMs = Math.max(0, Math.round(currentPauseStart - sessionStart));
      const endMs = Math.max(startMs, Math.round(frame.timestamp - sessionStart));
      rawPauses.push({ startMs, endMs, durationMs: endMs - startMs });
      currentPauseStart = null;
    }
  }

  if (currentPauseStart !== null) {
    const startMs = Math.max(0, Math.round(currentPauseStart - sessionStart));
    const endMs = totalDurationMs;
    rawPauses.push({ startMs, endMs, durationMs: endMs - startMs });
  }

  const pauses = mergeClosePauses(rawPauses, config.mergeGapMs).filter(
    (pause) => pause.durationMs >= config.minPauseMs,
  );
  const totalPauseDurationMs = pauses.reduce((sum, pause) => sum + pause.durationMs, 0);
  const totalPauses = pauses.length;
  const averagePauseMs = totalPauses > 0 ? Math.round(totalPauseDurationMs / totalPauses) : 0;
  const longestPauseMs = pauses.reduce(
    (longest, pause) => Math.max(longest, pause.durationMs),
    0,
  );
  const silenceRatio = Number((totalPauseDurationMs / totalDurationMs).toFixed(4));

  return {
    totalPauses,
    totalPauseDurationMs,
    averagePauseMs,
    longestPauseMs,
    silenceRatio,
    classification: classifyPauseMetrics(totalPauses, silenceRatio),
    pauses,
  };
}
