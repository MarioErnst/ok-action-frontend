// Manages the elapsed-time counter during a recording phase.
// Used exclusively by useEvaluationSession; not part of the public API.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionPhase } from './useEvaluationSession';

const RECORDING_TICK_MS = 100;

interface UseSessionTimerResult {
  elapsedMs: number;
  clearElapsedInterval: () => void;
  resetElapsed: () => void;
}

/**
 * Tracks elapsed milliseconds while the session is in the 'recording' phase.
 * The interval ticks every RECORDING_TICK_MS and stops automatically when the
 * phase leaves 'recording'.
 *
 * @param phase - Current session phase; the interval only runs during 'recording'.
 */
export function useSessionTimer(phase: SessionPhase): UseSessionTimerResult {
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedIntervalRef = useRef<number | null>(null);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const resetElapsed = useCallback(() => {
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    if (phase !== 'recording') {
      clearElapsedInterval();
      return;
    }

    clearElapsedInterval();
    setElapsedMs(0);
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedMs((prev) => prev + RECORDING_TICK_MS);
    }, RECORDING_TICK_MS);

    return () => {
      clearElapsedInterval();
    };
  }, [phase, clearElapsedInterval]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearElapsedInterval();
    };
  }, [clearElapsedInterval]);

  return { elapsedMs, clearElapsedInterval, resetElapsed };
}
