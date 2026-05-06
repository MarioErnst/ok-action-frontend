// Manages the pre-exercise countdown interval.
// Used exclusively by useEvaluationSession; not part of the public API.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionPhase } from './useEvaluationSession';

const COUNTDOWN_START = 3;

interface UseSessionCountdownResult {
  countdown: number;
  clearCountdownInterval: () => void;
  resetCountdown: () => void;
}

/**
 * Drives the countdown that precedes each recording phase.
 * When the countdown reaches zero it sets the phase to 'recording' via onCountdownComplete.
 *
 * @param phase - Current session phase; the interval only runs during 'countdown'.
 * @param onCountdownComplete - Called when the countdown reaches zero. Receives the
 *   recording start timestamp so the caller can anchor frame capture.
 */
export function useSessionCountdown(
  phase: SessionPhase,
  onCountdownComplete: (recordingStartAt: number) => void,
): UseSessionCountdownResult {
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const countdownIntervalRef = useRef<number | null>(null);
  // Stable ref to the callback so the interval closure does not capture a stale version.
  const onCompleteRef = useRef(onCountdownComplete);
  onCompleteRef.current = onCountdownComplete;

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const resetCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_START);
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') {
      clearCountdownInterval();
      return;
    }

    setCountdown(COUNTDOWN_START);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdownInterval();
          onCompleteRef.current(Date.now());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearCountdownInterval();
    };
  }, [phase, clearCountdownInterval]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearCountdownInterval();
    };
  }, [clearCountdownInterval]);

  return { countdown, clearCountdownInterval, resetCountdown };
}
