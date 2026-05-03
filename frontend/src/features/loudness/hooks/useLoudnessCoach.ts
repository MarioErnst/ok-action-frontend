// Session logic for the loudness module: documentacion/modulos/volumen.md
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceMonitor } from '../../phonation/index';
import { computeEffectiveConfig } from '../services/loudnessEffectiveConfig';
import { classifyLoudness } from '../services/loudnessClassifier';
import type {
  CalibrationPhase,
  LoudnessBand,
  LoudnessConfig,
  LoudnessMetrics,
  LoudnessPreset,
} from '../types';
import useVoiceBaseline from './useVoiceBaseline';

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
      return db < noiseFloor + config.silenceOffsetDb - HYSTERESIS_MARGIN_DB;
    case 'too-low':
      return db >= noiseFloor + config.silenceOffsetDb + HYSTERESIS_MARGIN_DB && db < config.tooLowCeilingDbfs - HYSTERESIS_MARGIN_DB;
    case 'optimal':
      return db >= config.tooLowCeilingDbfs + HYSTERESIS_MARGIN_DB && db < config.optimalCeilingDbfs - HYSTERESIS_MARGIN_DB;
    case 'too-high':
      return db >= config.optimalCeilingDbfs + HYSTERESIS_MARGIN_DB && db < config.clipThresholdDbfs - HYSTERESIS_MARGIN_DB;
    case 'clipping':
      return db >= config.clipThresholdDbfs + HYSTERESIS_MARGIN_DB;
  }
}

function updateOptimalPercent(metrics: LoudnessMetrics): void {
  const activeTimeMs = metrics.durationMs - metrics.bandTimeMs.silence;
  metrics.optimalPercent = activeTimeMs > 0 ? (metrics.bandTimeMs.optimal / activeTimeMs) * 100 : 0;
}

export default function useLoudnessCoach(preset: LoudnessPreset): {
  band: LoudnessBand;
  db: number;
  noiseFloor: number;
  isListening: boolean;
  calibrationPhase: CalibrationPhase;
  effectiveConfig: LoudnessConfig | null;
  metrics: LoudnessMetrics;
  start(): void;
  stop(): void;
} {
  const {
    db,
    noiseFloor,
    isCalibrating,
    isListening,
    frames,
    start: startVoiceMonitor,
    stop: stopVoiceMonitor,
  } = useVoiceMonitor();

  const { voiceBaseline, isBaselineCalibrating } = useVoiceBaseline(
    noiseFloor,
    isCalibrating,
    isListening,
    frames,
  );

  const effectiveConfig = useMemo<LoudnessConfig | null>(
    () => (voiceBaseline !== null ? computeEffectiveConfig(preset, voiceBaseline) : null),
    [preset, voiceBaseline],
  );

  const calibrationPhase = useMemo<CalibrationPhase>(() => {
    if (!isListening && !isCalibrating && !isBaselineCalibrating) return 'idle';
    if (isCalibrating) return 'noise';
    if (isBaselineCalibrating) return 'voice';
    return 'active';
  }, [isBaselineCalibrating, isCalibrating, isListening]);

  const [band, setBand] = useState<LoudnessBand>('silence');
  const [metrics, setMetrics] = useState<LoudnessMetrics>(createEmptyMetrics);

  const acceptedBandRef = useRef<LoudnessBand>('silence');
  const pendingBandRef = useRef<LoudnessBand>('silence');
  const bandDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metricsRef = useRef<LoudnessMetrics>(createEmptyMetrics());
  const lastFrameTimestampRef = useRef<number | null>(null);
  const pendingActiveFrameTimestampRef = useRef<number | null>(null);

  const clearBandDebounce = useCallback(() => {
    if (bandDebounceTimeoutRef.current !== null) {
      clearTimeout(bandDebounceTimeoutRef.current);
      bandDebounceTimeoutRef.current = null;
    }
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = createEmptyMetrics();
    lastFrameTimestampRef.current = null;
    pendingActiveFrameTimestampRef.current = null;
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
    if (effectiveConfig === null) return;

    const rawBand = classifyLoudness(db, noiseFloor, effectiveConfig);
    const acceptedBand = acceptedBandRef.current;

    const nextCandidateBand =
      rawBand === acceptedBand || isDeepEnoughInBand(rawBand, db, noiseFloor, effectiveConfig)
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
  }, [clearBandDebounce, db, effectiveConfig, noiseFloor]);

  // Anchor-setting and accumulation are in one effect to avoid a race condition:
  // two effects sharing the same [effectiveConfig, frames] deps have no guaranteed order.
  useEffect(() => {
    if (effectiveConfig === null) {
      pendingActiveFrameTimestampRef.current = null;
      return;
    }

    // First render with valid effectiveConfig: anchor to current frame so calibration
    // frames are never counted as session metrics.
    if (pendingActiveFrameTimestampRef.current === null) {
      const latestFrame = frames[frames.length - 1];
      pendingActiveFrameTimestampRef.current = latestFrame ? latestFrame.timestamp : Date.now();
      lastFrameTimestampRef.current = latestFrame ? latestFrame.timestamp : null;
      return;
    }

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

      const frameBand = classifyLoudness(frame.db, noiseFloor, effectiveConfig);
      metricsRef.current.durationMs += deltaMs;
      metricsRef.current.bandTimeMs[frameBand] += deltaMs;
      metricsRef.current.peakDb = Math.max(metricsRef.current.peakDb, frame.db);
      updateOptimalPercent(metricsRef.current);
    }

    syncMetricsState();
  }, [effectiveConfig, frames, noiseFloor, syncMetricsState]);

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
    setBand('silence');
  }, [isCalibrating, isListening]);

  return {
    band,
    db,
    noiseFloor,
    isListening,
    calibrationPhase,
    effectiveConfig,
    metrics,
    start,
    stop,
  };
}