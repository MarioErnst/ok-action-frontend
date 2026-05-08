// Session logic for the loudness module: documentacion/modulos/volumen.md
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { VoiceMonitor } from '../../../../shared/types/audioTypes';
import { toSaveLoudnessSessionDto } from '../../infrastructure/mappers/loudnessMapper';
import { HttpLoudnessRepository } from '../../infrastructure/repositories/HttpLoudnessRepository';
import { computeEffectiveConfig } from '../../services/loudnessEffectiveConfig';
import type {
  CalibrationPhase,
  LoudnessBand,
  LoudnessConfig,
  LoudnessMetrics,
  LoudnessPreset,
} from '../../domain/LoudnessSession';
import { useBandDebounce } from './useBandDebounce';
import { useLoudnessMetrics } from './useLoudnessMetrics';
import useVoiceBaseline from './useVoiceBaseline';

// voiceMonitor is injected so that loudness does not depend on phonation directly.
// The caller (LoudnessCoachPage, LoudnessTestPage) creates the monitor and passes it in.
export default function useLoudnessCoach(
  preset: LoudnessPreset,
  voiceMonitor: VoiceMonitor,
): {
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
  } = voiceMonitor;

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

  // Delegate band classification (with hysteresis + debounce) to a focused hook.
  const { band, clearBandDebounce, resetBandState } = useBandDebounce(db, noiseFloor, effectiveConfig);

  // Delegate per-frame metric accumulation to a focused hook.
  const { metrics, resetMetrics, syncMetricsState } = useLoudnessMetrics(frames, noiseFloor, effectiveConfig);

  // Reset band to silence when the monitor is not active so the UI reflects
  // the stopped state immediately rather than showing a stale band.
  useEffect(() => {
    if (isListening || isCalibrating) return;
    resetBandState();
  }, [isCalibrating, isListening, resetBandState]);

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

  const sessionSavedRef = useRef(false);

  // A finished session is detected when calibrationPhase returns to idle after active use.
  // Save once per completed session; reset the guard when a new session starts.
  useEffect(() => {
    const finished = calibrationPhase === 'idle' && metrics.durationMs > 0;
    if (finished && !sessionSavedRef.current) {
      sessionSavedRef.current = true;
      const dto = toSaveLoudnessSessionDto(metrics, preset.presetId);
      HttpLoudnessRepository.saveSession(dto).catch((err) => {
        console.error('Error saving loudness session:', err);
      });
    }
    if (!finished) {
      sessionSavedRef.current = false;
    }
  }, [calibrationPhase, metrics, preset.presetId]);

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
