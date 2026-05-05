// Accumulates per-frame loudness metrics during an active session.
// Used exclusively by useLoudnessCoach; not part of the public API.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhonationFrame } from '../../phonation/types';
import { classifyLoudness } from '../services/loudnessClassifier';
import type { LoudnessConfig, LoudnessMetrics } from '../types';

function createEmptyMetrics(): LoudnessMetrics {
  return {
    durationMs: 0,
    bandTimeMs: {
      silence: 0,
      'too-low': 0,
      optimal: 0,
      'too-high': 0,
      clipping: 0,
    },
    optimalPercent: 0,
    peakDb: -100,
  };
}

function cloneMetrics(metrics: LoudnessMetrics): LoudnessMetrics {
  return {
    durationMs: metrics.durationMs,
    bandTimeMs: { ...metrics.bandTimeMs },
    optimalPercent: metrics.optimalPercent,
    peakDb: metrics.peakDb,
  };
}

function updateOptimalPercent(metrics: LoudnessMetrics): void {
  const activeTimeMs = metrics.durationMs - metrics.bandTimeMs.silence;
  metrics.optimalPercent = activeTimeMs > 0 ? (metrics.bandTimeMs.optimal / activeTimeMs) * 100 : 0;
}

interface UseLoudnessMetricsResult {
  metrics: LoudnessMetrics;
  resetMetrics: () => void;
  syncMetricsState: () => void;
}

/**
 * Iterates over new frames since the last processed timestamp and accumulates
 * band duration and peak dB into a mutable ref for performance.
 * The ref is flushed to React state on each batch (syncMetricsState).
 *
 * Anchor-setting and accumulation are handled in one effect to prevent a
 * race condition that would occur if two effects shared the same deps and ran
 * in undefined order.
 *
 * @param frames - Full frame buffer from the voice monitor.
 * @param noiseFloor - Measured ambient noise floor in dBFS.
 * @param effectiveConfig - Resolved loudness thresholds; null pauses accumulation
 *   and resets the anchor so calibration frames are never counted.
 */
export function useLoudnessMetrics(
  frames: PhonationFrame[],
  noiseFloor: number,
  effectiveConfig: LoudnessConfig | null,
): UseLoudnessMetricsResult {
  const [metrics, setMetrics] = useState<LoudnessMetrics>(createEmptyMetrics);

  const metricsRef = useRef<LoudnessMetrics>(createEmptyMetrics());
  const lastFrameTimestampRef = useRef<number | null>(null);
  const pendingActiveFrameTimestampRef = useRef<number | null>(null);

  const resetMetrics = useCallback(() => {
    metricsRef.current = createEmptyMetrics();
    lastFrameTimestampRef.current = null;
    pendingActiveFrameTimestampRef.current = null;
    setMetrics(cloneMetrics(metricsRef.current));
  }, []);

  const syncMetricsState = useCallback(() => {
    setMetrics(cloneMetrics(metricsRef.current));
  }, []);

  useEffect(() => {
    if (effectiveConfig === null) {
      // Config went away (e.g. monitor stopped); reset anchor so the next active
      // session does not count frames from the previous run.
      pendingActiveFrameTimestampRef.current = null;
      return;
    }

    // First render with a valid config: anchor to the latest frame so that
    // frames produced during calibration are excluded from session metrics.
    if (pendingActiveFrameTimestampRef.current === null) {
      const latestFrame = frames[frames.length - 1];
      pendingActiveFrameTimestampRef.current = latestFrame ? latestFrame.timestamp : Date.now();
      lastFrameTimestampRef.current = latestFrame ? latestFrame.timestamp : null;
      return;
    }

    const newFrames =
      lastFrameTimestampRef.current === null
        ? frames
        : frames.filter((frame) => frame.timestamp > lastFrameTimestampRef.current!);

    if (newFrames.length === 0) return;

    for (const frame of newFrames) {
      if (lastFrameTimestampRef.current === null) {
        lastFrameTimestampRef.current = frame.timestamp;
        metricsRef.current.peakDb = Math.max(metricsRef.current.peakDb, frame.db);
        continue;
      }

      const deltaMs = Math.max(0, frame.timestamp - lastFrameTimestampRef.current);
      lastFrameTimestampRef.current = frame.timestamp;

      const frameBand = classifyLoudness(frame.db, noiseFloor, effectiveConfig);
      metricsRef.current.durationMs += deltaMs;
      metricsRef.current.bandTimeMs[frameBand] += deltaMs;
      metricsRef.current.peakDb = Math.max(metricsRef.current.peakDb, frame.db);
      updateOptimalPercent(metricsRef.current);
    }

    syncMetricsState();
  }, [effectiveConfig, frames, noiseFloor, syncMetricsState]);

  return { metrics, resetMetrics, syncMetricsState };
}
