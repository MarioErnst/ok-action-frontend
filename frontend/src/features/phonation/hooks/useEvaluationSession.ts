// Session logic for the phonation module: documentacion/modulos/fonacion.md
import { useCallback, useEffect, useRef, useState } from 'react';
import { toSavePhonationSessionDto } from '../infrastructure/mappers/phonationMapper';
import { HttpPhonationRepository } from '../infrastructure/repositories/HttpPhonationRepository';
import { VOICE_EXERCISES } from '../services/exercises';
import type { PhonationFrame, SessionResult, VoiceExercise } from '../types';
import useDiagnosis from './useDiagnosis';
import useVoiceMonitor from './useVoiceMonitor';

export type SessionPhase = 'idle' | 'countdown' | 'recording' | 'finished';

const COUNTDOWN_START = 3;
const RECORDING_TICK_MS = 100;

export default function useEvaluationSession(customExercises?: VoiceExercise[]) {
  const { hz, db, isCalibrating, frames, start, stop } = useVoiceMonitor();

  const exercises = customExercises ?? VOICE_EXERCISES;

  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [recordedResults, setRecordedResults] = useState<Map<string, PhonationFrame[]>>(new Map());
  const [elapsedMs, setElapsedMs] = useState(0);

  const countdownIntervalRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);
  const recordingStartAtRef = useRef<number>(0);
  const lastCapturedTimestampRef = useRef<number>(0);

  const exerciseKey = exercises.map((e) => e.id).join(',');

  useEffect(() => {
    setPhase('idle');
    setCurrentIndex(0);
    setCountdown(COUNTDOWN_START);
    setElapsedMs(0);
    setRecordedResults(new Map());
    recordingStartAtRef.current = 0;
    lastCapturedTimestampRef.current = 0;
    void stop();
  }, [exerciseKey, stop]);

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    clearCountdownInterval();
    clearElapsedInterval();

    setCurrentIndex(0);
    setCountdown(COUNTDOWN_START);
    setElapsedMs(0);
    setRecordedResults(new Map());
    recordingStartAtRef.current = 0;
    lastCapturedTimestampRef.current = 0;

    await start();
    setPhase('countdown');
  }, [clearCountdownInterval, clearElapsedInterval, start]);

  const resetSession = useCallback(() => {
    clearCountdownInterval();
    clearElapsedInterval();

    setPhase('idle');
    setCurrentIndex(0);
    setCountdown(COUNTDOWN_START);
    setElapsedMs(0);
    setRecordedResults(new Map());
    recordingStartAtRef.current = 0;
    lastCapturedTimestampRef.current = 0;

    void stop();
  }, [clearCountdownInterval, clearElapsedInterval, stop]);

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
          setElapsedMs(0);
          recordingStartAtRef.current = Date.now();
          lastCapturedTimestampRef.current = recordingStartAtRef.current - 1;
          setPhase('recording');
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearCountdownInterval();
    };
  }, [phase, clearCountdownInterval]);

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

  const currentExercise: VoiceExercise | null =
    phase === 'idle' || phase === 'finished' ? null : (exercises[currentIndex] ?? null);

  useEffect(() => {
    if (phase !== 'recording' || !currentExercise) return;

    const newFrames = frames.filter(
      (frame) => frame.timestamp >= recordingStartAtRef.current && frame.timestamp > lastCapturedTimestampRef.current,
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

  useEffect(() => {
    if (phase !== 'recording' || !currentExercise) return;

    if (elapsedMs < currentExercise.durationMs) return;

    clearElapsedInterval();

    if (currentIndex >= exercises.length - 1) {
      setPhase('finished');
      void stop();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setCountdown(COUNTDOWN_START);
    setElapsedMs(0);
    setPhase('countdown');
  }, [
    phase,
    currentExercise,
    elapsedMs,
    currentIndex,
    clearElapsedInterval,
    stop,
  ]);

  useEffect(() => {
    return () => {
      clearCountdownInterval();
      clearElapsedInterval();
    };
  }, [clearCountdownInterval, clearElapsedInterval]);

  // Diagnosis is computed here so the hook owns all session data including results.
  // The organism receives the computed result as a prop and stays purely visual.
  const { result: diagnosisResult } = useDiagnosis(
    phase === 'finished' ? recordedResults : new Map<string, PhonationFrame[]>(),
    exercises,
  );

  const savedRef = useRef(false);

  // Save the session to the backend once, when the diagnosis result is available.
  // Persistence belongs in the hook, not in the results organism.
  useEffect(() => {
    if (diagnosisResult && !savedRef.current) {
      savedRef.current = true;
      const dto = toSavePhonationSessionDto(diagnosisResult);
      HttpPhonationRepository.saveSession(dto).catch((err) => {
        console.error('Error saving phonation session:', err);
      });
    }
  }, [diagnosisResult]);

  useEffect(() => {
    if (phase !== 'finished') {
      savedRef.current = false;
    }
  }, [phase]);

  return {
    phase,
    currentExercise,
    currentIndex,
    totalExercises: exercises.length,
    countdown,
    elapsedMs,
    recordedResults,
    diagnosisResult,
    hz,
    db,
    isCalibrating,
    startSession,
    resetSession,
  };
}
