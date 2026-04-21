import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhonationFrame } from '../../phonation/types';
import { computeVoiceBaseline } from '../services/loudnessEffectiveConfig';

const BASELINE_DURATION_MS = 10_000;
const BASELINE_FALLBACK_OFFSET_DB = 20;

interface UseVoiceBaselineResult {
  voiceBaseline: number | null;
  isBaselineCalibrating: boolean;
}

export default function useVoiceBaseline(
  noiseFloor: number,
  isCalibrating: boolean,
  isListening: boolean,
  frames: PhonationFrame[],
): UseVoiceBaselineResult {
  const [voiceBaseline, setVoiceBaseline] = useState<number | null>(null);
  const [isBaselineCalibrating, setIsBaselineCalibrating] = useState(false);

  const noiseFloorRef = useRef(noiseFloor);
  const prevCalibratingRef = useRef(isCalibrating);
  const wasListeningRef = useRef(isListening);
  const isCollectingRef = useRef(false);
  const baselineStartTimestampRef = useRef<number | null>(null);
  const lastFrameTimestampRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    isCollectingRef.current = false;
    baselineStartTimestampRef.current = null;
    lastFrameTimestampRef.current = null;
    samplesRef.current = [];
    setIsBaselineCalibrating(false);
    setVoiceBaseline(null);
  }, [clearTimer]);

  useEffect(() => {
    noiseFloorRef.current = noiseFloor;
  }, [noiseFloor]);

  useEffect(() => {
    if (!isCollectingRef.current) return;

    const lastTimestamp = lastFrameTimestampRef.current;
    const startTimestamp = baselineStartTimestampRef.current;

    const newFrames = frames.filter((frame) => {
      if (startTimestamp === null) return false;
      if (frame.timestamp <= startTimestamp) return false;
      return lastTimestamp === null ? true : frame.timestamp > lastTimestamp;
    });

    if (newFrames.length === 0) return;

    for (const frame of newFrames) {
      samplesRef.current.push(frame.db);
    }

    lastFrameTimestampRef.current = newFrames[newFrames.length - 1].timestamp;
  }, [frames]);

  useEffect(() => {
    const wasCalibrating = prevCalibratingRef.current;
    prevCalibratingRef.current = isCalibrating;

    if (!isListening) {
      if (wasListeningRef.current) {
        wasListeningRef.current = false;
        reset();
      }
      return;
    }

    wasListeningRef.current = true;

    if (!wasCalibrating || isCalibrating) {
      return;
    }

    clearTimer();
    samplesRef.current = [];
    baselineStartTimestampRef.current = Date.now();
    lastFrameTimestampRef.current = baselineStartTimestampRef.current;
    isCollectingRef.current = true;
    setIsBaselineCalibrating(true);

    timerRef.current = setTimeout(() => {
      const baseline = computeVoiceBaseline(samplesRef.current, noiseFloorRef.current);
      const fallbackBaseline = noiseFloorRef.current + BASELINE_FALLBACK_OFFSET_DB;

      isCollectingRef.current = false;
      timerRef.current = null;
      setIsBaselineCalibrating(false);
      setVoiceBaseline(baseline ?? fallbackBaseline);
    }, BASELINE_DURATION_MS);
  }, [clearTimer, isCalibrating, isListening, reset]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { voiceBaseline, isBaselineCalibrating };
}