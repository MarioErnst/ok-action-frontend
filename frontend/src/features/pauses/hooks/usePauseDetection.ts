import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceMonitor } from '../../phonation';
import type { PhonationFrame } from '../../phonation/types';
import { analyzePauseFrames, DEFAULT_PAUSE_ANALYSIS_CONFIG } from '../services/pauseAnalysis';
import type { PauseDetectionPhase, PauseDetectionResult } from '../types';

const DEFAULT_DURATION_MS = 20_000;
const ELAPSED_TICK_MS = 100;

export default function usePauseDetection(defaultDurationMs = DEFAULT_DURATION_MS) {
  const {
    db,
    noiseFloor,
    isCalibrating,
    isListening,
    frames,
    start: startVoiceMonitor,
    stop: stopVoiceMonitor,
  } = useVoiceMonitor();
  const [phase, setPhase] = useState<PauseDetectionPhase>('idle');
  const [durationMs, setDurationMs] = useState(defaultDurationMs);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordedFrames, setRecordedFrames] = useState<PhonationFrame[]>([]);
  const [result, setResult] = useState<PauseDetectionResult | null>(null);

  const phaseRef = useRef<PauseDetectionPhase>('idle');
  const durationMsRef = useRef(defaultDurationMs);
  const recordedFramesRef = useRef<PhonationFrame[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const lastFrameTimestampRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didAutoStopRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const currentMetrics = useMemo(
    () => analyzePauseFrames(recordedFrames, noiseFloor, elapsedMs),
    [elapsedMs, noiseFloor, recordedFrames],
  );

  const isSilent =
    phase === 'recording' &&
    db < noiseFloor + DEFAULT_PAUSE_ANALYSIS_CONFIG.silenceOffsetDb;

  const finishRecording = useCallback(async () => {
    if (phaseRef.current !== 'recording' && phaseRef.current !== 'calibrating') return;

    clearElapsedInterval();

    const startedAt = recordingStartedAtRef.current ?? Date.now();
    const measuredDurationMs = Math.min(
      durationMsRef.current,
      Math.max(0, Date.now() - startedAt),
    );
    const finalMetrics = analyzePauseFrames(
      recordedFramesRef.current,
      noiseFloor,
      measuredDurationMs,
    );

    setElapsedMs(measuredDurationMs);
    setResult({
      durationMs: measuredDurationMs,
      pauseMetrics: finalMetrics,
      timestamp: Date.now(),
    });

    await stopVoiceMonitor();
    setPhase('finished');
  }, [clearElapsedInterval, noiseFloor, stopVoiceMonitor]);

  const start = useCallback(
    async (nextDurationMs = defaultDurationMs) => {
      clearElapsedInterval();
      durationMsRef.current = nextDurationMs;
      recordedFramesRef.current = [];
      recordingStartedAtRef.current = null;
      lastFrameTimestampRef.current = null;
      didAutoStopRef.current = false;

      setDurationMs(nextDurationMs);
      setElapsedMs(0);
      setRecordedFrames([]);
      setResult(null);
      setPhase('calibrating');

      await startVoiceMonitor();
    },
    [clearElapsedInterval, defaultDurationMs, startVoiceMonitor],
  );

  const reset = useCallback(() => {
    clearElapsedInterval();
    recordedFramesRef.current = [];
    recordingStartedAtRef.current = null;
    lastFrameTimestampRef.current = null;
    didAutoStopRef.current = false;

    setPhase('idle');
    setElapsedMs(0);
    setRecordedFrames([]);
    setResult(null);
    void stopVoiceMonitor();
  }, [clearElapsedInterval, stopVoiceMonitor]);

  useEffect(() => {
    if (phase !== 'calibrating') return;
    if (!isListening || isCalibrating) return;

    const startedAt = Date.now();
    recordingStartedAtRef.current = startedAt;
    lastFrameTimestampRef.current = startedAt - 1;
    recordedFramesRef.current = [];
    setRecordedFrames([]);
    setElapsedMs(0);
    setPhase('recording');

    elapsedIntervalRef.current = setInterval(() => {
      setElapsedMs((previous) => Math.min(previous + ELAPSED_TICK_MS, durationMsRef.current));
    }, ELAPSED_TICK_MS);
  }, [isCalibrating, isListening, phase]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const startedAt = recordingStartedAtRef.current;
    if (startedAt === null) return;

    const lastTimestamp = lastFrameTimestampRef.current;
    const newFrames = frames.filter((frame) => {
      if (frame.timestamp < startedAt) return false;
      return lastTimestamp === null ? true : frame.timestamp > lastTimestamp;
    });

    if (newFrames.length === 0) return;

    lastFrameTimestampRef.current = newFrames[newFrames.length - 1].timestamp;
    setRecordedFrames((previous) => {
      const next = previous.concat(newFrames);
      recordedFramesRef.current = next;
      return next;
    });
  }, [frames, phase]);

  useEffect(() => {
    if (phase !== 'recording') return;
    if (elapsedMs < durationMsRef.current || didAutoStopRef.current) return;

    didAutoStopRef.current = true;
    void finishRecording();
  }, [elapsedMs, finishRecording, phase]);

  useEffect(() => {
    return () => {
      clearElapsedInterval();
      void stopVoiceMonitor();
    };
  }, [clearElapsedInterval, stopVoiceMonitor]);

  return {
    phase,
    db,
    noiseFloor,
    elapsedMs,
    durationMs,
    isCalibrating,
    isListening,
    isSilent,
    currentMetrics,
    result,
    start,
    stop: finishRecording,
    reset,
  };
}
