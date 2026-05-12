// Session logic for the phonation module: documentacion/modulos/fonacion.md
import { useCallback, useEffect, useRef, useState } from 'react';
import { toSavePhonationSessionDto } from '../../infrastructure/mappers/phonationMapper';
import { HttpPhonationRepository } from '../../infrastructure/repositories/HttpPhonationRepository';
import { VOICE_EXERCISES } from '../../services/exercises';
import type { PhonationFrame, VoiceExercise } from '../../domain/PhonationSession';
import useDiagnosis from './useDiagnosis';
import useVoiceMonitor from './useVoiceMonitor';
import { useFrameAccumulator } from './useFrameAccumulator';
import { useSessionCountdown } from './useSessionCountdown';
import { useSessionTimer } from './useSessionTimer';

export type SessionPhase = 'idle' | 'countdown' | 'recording' | 'finished';

export default function useEvaluationSession(customExercises?: VoiceExercise[]) {
  const { hz, db, isCalibrating, frames, start, stop } = useVoiceMonitor();

  const exercises = customExercises ?? VOICE_EXERCISES;

  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);

  const exerciseKey = exercises.map((e) => e.id).join(',');

  const currentExercise: VoiceExercise | null =
    phase === 'idle' || phase === 'finished' ? null : (exercises[currentIndex] ?? null);

  // Delegate countdown, elapsed timer, and frame accumulation to auxiliary hooks.
  const { countdown, clearCountdownInterval, resetCountdown } = useSessionCountdown(
    phase,
    (recordingStartAt) => {
      accumulator.setRecordingAnchor(recordingStartAt);
      setPhase('recording');
    },
  );

  const { elapsedMs, clearElapsedInterval, resetElapsed } = useSessionTimer(phase);

  const accumulator = useFrameAccumulator(phase, currentExercise, frames);

  // Reset everything when the exercise list changes.
  useEffect(() => {
    setPhase('idle');
    setCurrentIndex(0);
    resetCountdown();
    resetElapsed();
    accumulator.resetRecordedResults();
    void stop();
  }, [exerciseKey, stop]);

  const startSession = useCallback(async () => {
    clearCountdownInterval();
    clearElapsedInterval();

    setCurrentIndex(0);
    resetCountdown();
    resetElapsed();
    accumulator.resetRecordedResults();

    await start();
    setPhase('countdown');
  }, [clearCountdownInterval, clearElapsedInterval, resetCountdown, resetElapsed, start]);

  const resetSession = useCallback(() => {
    clearCountdownInterval();
    clearElapsedInterval();

    setPhase('idle');
    setCurrentIndex(0);
    resetCountdown();
    resetElapsed();
    accumulator.resetRecordedResults();

    void stop();
  }, [clearCountdownInterval, clearElapsedInterval, resetCountdown, resetElapsed, stop]);

  // Advance to the next exercise or finish when the current exercise duration elapses.
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
    resetCountdown();
    resetElapsed();
    setPhase('countdown');
  }, [phase, currentExercise, elapsedMs, currentIndex, exercises.length, clearElapsedInterval, resetCountdown, resetElapsed, stop]);

  // Diagnosis is computed here so the hook owns all session data including results.
  // The organism receives the computed result as a prop and stays purely visual.
  const { result: diagnosisResult } = useDiagnosis(
    phase === 'finished' ? accumulator.recordedResults : new Map<string, PhonationFrame[]>(),
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
    recordedResults: accumulator.recordedResults,
    diagnosisResult,
    hz,
    db,
    isCalibrating,
    startSession,
    resetSession,
  };
}
