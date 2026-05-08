// Accumulates phonation frames per exercise during a recording session.
// Used exclusively by useEvaluationSession; not part of the public API.
import { useEffect, useRef, useState } from 'react';
import type { PhonationFrame, VoiceExercise } from '../../types';
import type { SessionPhase } from './useEvaluationSession';

interface UseFrameAccumulatorResult {
  recordedResults: Map<string, PhonationFrame[]>;
  resetRecordedResults: () => void;
  setRecordingAnchor: (timestamp: number) => void;
}

/**
 * Filters incoming frames to those produced after the recording anchor timestamp
 * and appends them to the per-exercise accumulator map.
 *
 * The anchor is set externally (by useEvaluationSession) when the countdown
 * completes, so calibration frames are never counted as session data.
 *
 * @param phase - Current session phase; accumulation only runs during 'recording'.
 * @param currentExercise - The exercise currently being recorded; null stops accumulation.
 * @param frames - Full frame buffer from the voice monitor, appended on every tick.
 */
export function useFrameAccumulator(
  phase: SessionPhase,
  currentExercise: VoiceExercise | null,
  frames: PhonationFrame[],
): UseFrameAccumulatorResult {
  const [recordedResults, setRecordedResults] = useState<Map<string, PhonationFrame[]>>(new Map());
  const recordingStartAtRef = useRef<number>(0);
  const lastCapturedTimestampRef = useRef<number>(0);

  const resetRecordedResults = () => {
    setRecordedResults(new Map());
    recordingStartAtRef.current = 0;
    lastCapturedTimestampRef.current = 0;
  };

  const setRecordingAnchor = (timestamp: number) => {
    recordingStartAtRef.current = timestamp;
    // Start just before the anchor so the first frame at exactly that timestamp is included.
    lastCapturedTimestampRef.current = timestamp - 1;
  };

  useEffect(() => {
    if (phase !== 'recording' || !currentExercise) return;

    const newFrames = frames.filter(
      (frame) =>
        frame.timestamp >= recordingStartAtRef.current &&
        frame.timestamp > lastCapturedTimestampRef.current,
    );

    if (newFrames.length === 0) return;

    lastCapturedTimestampRef.current = newFrames[newFrames.length - 1].timestamp;

    setRecordedResults((prev) => {
      const next = new Map(prev);
      const previousFrames = next.get(currentExercise.id) ?? [];
      next.set(currentExercise.id, previousFrames.concat(newFrames));
      return next;
    });
  }, [frames, phase, currentExercise]);

  return { recordedResults, resetRecordedResults, setRecordingAnchor };
}
