import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceMonitor } from '../../phonation/index';
import { classifyLoudness } from '../services/loudnessClassifier';
import type { LoudnessBand, LoudnessConfig, LoudnessMetrics } from '../types';

const HYSTERESIS_MARGIN_DB = 2;
const BAND_DEBOUNCE_MS = 400;

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

function isDeepEnoughInBand(
  band: LoudnessBand,
  db: number,
  noiseFloor: number,
  config: LoudnessConfig,
): boolean {
  switch (band) {
    case 'silence':
      return db < noiseFloor + 6 - HYSTERESIS_MARGIN_DB;
    case 'too-low':
      return db >= noiseFloor + 6 + HYSTERESIS_MARGIN_DB && db < noiseFloor + config.minOffsetDb - HYSTERESIS_MARGIN_DB;
    case 'optimal':
      return db >= noiseFloor + config.minOffsetDb + HYSTERESIS_MARGIN_DB && db < noiseFloor + config.maxOffsetDb - HYSTERESIS_MARGIN_DB;
    case 'too-high':
      return db >= noiseFloor + config.maxOffsetDb + HYSTERESIS_MARGIN_DB && db < config.clipThresholdDbfs - HYSTERESIS_MARGIN_DB;
    case 'clipping':
      return db >= config.clipThresholdDbfs + HYSTERESIS_MARGIN_DB;
  }
}

function updateOptimalPercent(metrics: LoudnessMetrics): void {
  const activeTimeMs = metrics.durationMs - metrics.bandTimeMs.silence;
  metrics.optimalPercent = activeTimeMs > 0 ? (metrics.bandTimeMs.optimal / activeTimeMs) * 100 : 0;
}

export default function useLoudnessCoach(config: LoudnessConfig): {
  band: LoudnessBand;
  db: number;
  noiseFloor: number;
  isCalibrating: boolean;
  isListening: boolean;
  metrics: LoudnessMetrics;
  start(): void;
  stop(): void;
} {
  const { db, noiseFloor, isCalibrating, isListening, frames, start: startVoiceMonitor, stop: stopVoiceMonitor } = useVoiceMonitor();

  const [band, setBand] = useState<LoudnessBand>('silence');
  const [metrics, setMetrics] = useState<LoudnessMetrics>(createEmptyMetrics);

  const acceptedBandRef = useRef<LoudnessBand>('silence');
  const pendingBandRef = useRef<LoudnessBand>('silence');
  const bandDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metricsRef = useRef<LoudnessMetrics>(createEmptyMetrics());
  const lastFrameTimestampRef = useRef<number | null>(null);

  const clearBandDebounce = useCallback(() => {
    if (bandDebounceTimeoutRef.current !== null) {
      clearTimeout(bandDebounceTimeoutRef.current);
      bandDebounceTimeoutRef.current = null;
    }
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = createEmptyMetrics();
    lastFrameTimestampRef.current = null;
    setMetrics(cloneMetrics(metricsRef.current));
  }, []);

  const resetBandState = useCallback(() => {
    clearBandDebounce();
    acceptedBandRef.current = 'silence';
    pendingBandRef.current = 'silence';
    setBand('silence');
  }, [clearBandDebounce]);

  const syncMetricsState = useCallback(() => {
    setMetrics(cloneMetrics(metricsRef.current));
  }, []);

  useEffect(() => {
    const rawBand = classifyLoudness(db, noiseFloor, config);
    const acceptedBand = acceptedBandRef.current;

    const nextCandidateBand =
      rawBand === acceptedBand || isDeepEnoughInBand(rawBand, db, noiseFloor, config)
        ? rawBand
        : acceptedBand;

    pendingBandRef.current = nextCandidateBand;

    if (nextCandidateBand === acceptedBand) {
      clearBandDebounce();
      return;
    }

    clearBandDebounce();
    bandDebounceTimeoutRef.current = setTimeout(() => {
      if (pendingBandRef.current !== nextCandidateBand) return;
      acceptedBandRef.current = nextCandidateBand;
      setBand(nextCandidateBand);
      bandDebounceTimeoutRef.current = null;
    }, BAND_DEBOUNCE_MS);
  }, [clearBandDebounce, config, db, noiseFloor]);

  useEffect(() => {
    const newFrames = lastFrameTimestampRef.current === null
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

      metricsRef.current.durationMs += deltaMs;
      metricsRef.current.bandTimeMs[acceptedBandRef.current] += deltaMs;
      metricsRef.current.peakDb = Math.max(metricsRef.current.peakDb, frame.db);
      updateOptimalPercent(metricsRef.current);
    }

    syncMetricsState();
  }, [frames, syncMetricsState]);

  const start = useCallback((): void => {
    resetMetrics();
    resetBandState();
    void startVoiceMonitor();
  }, [resetBandState, resetMetrics, startVoiceMonitor]);

  const stop = useCallback((): void => {
    clearBandDebounce();
    void stopVoiceMonitor().finally(() => {
      syncMetricsState();
    });
  }, [clearBandDebounce, stopVoiceMonitor, syncMetricsState]);

  useEffect(() => {
    return () => {
      clearBandDebounce();
    };
  }, [clearBandDebounce]);

  useEffect(() => {
    if (isListening || isCalibrating) return;

    acceptedBandRef.current = 'silence';
    pendingBandRef.current = 'silence';
  }, [isCalibrating, isListening]);

  return {
    band,
    db,
    noiseFloor,
    isCalibrating,
    isListening,
    metrics,
    start,
    stop,
  };
}