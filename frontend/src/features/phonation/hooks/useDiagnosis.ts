import { useMemo } from 'react';
import type { ExerciseResult, PhonationFrame, SessionResult, VoiceExercise } from '../types';

interface ExerciseAnalysis {
  exerciseResult: ExerciseResult;
  hasVoiceData: boolean;
}

function hasHz(frame: PhonationFrame): frame is PhonationFrame & { hz: number } {
  return frame.hz !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateAverage(values);
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeExercise(exercise: VoiceExercise, frames: PhonationFrame[]): ExerciseAnalysis {
  const voicedHzValues = frames.filter(hasHz).map((frame) => frame.hz);
  const avgHz = calculateAverage(voicedHzValues);
  const stdDeviation = calculateStandardDeviation(voicedHzValues);
  const stability = clamp(100 - stdDeviation * 2, 0, 100);

  let breaks = 0;
  let hadVoiceInPreviousFrame = false;

  for (const frame of frames) {
    const hasVoice = frame.hz !== null;

    if (hadVoiceInPreviousFrame && !hasVoice) {
      breaks += 1;
    }

    hadVoiceInPreviousFrame = hasVoice;
  }

  const inRange = avgHz >= exercise.targetHzRange.min && avgHz <= exercise.targetHzRange.max;

  return {
    exerciseResult: {
      exerciseId: exercise.id,
      frames,
      avgHz,
      stability,
      breaks,
      inRange,
    },
    hasVoiceData: voicedHzValues.length > 0,
  };
}

export default function useDiagnosis(
  recordedResults: Map<string, PhonationFrame[]>,
  exercises: VoiceExercise[],
): { result: SessionResult | null } {
  const result = useMemo<SessionResult | null>(() => {
    if (recordedResults.size === 0) {
      return null;
    }

    const analyses = exercises.map((exercise) => {
      const frames = recordedResults.get(exercise.id) ?? [];
      return analyzeExercise(exercise, frames);
    });

    const exerciseResults = analyses.map((analysis) => analysis.exerciseResult);
    const avgStability = calculateAverage(exerciseResults.map((exercise) => exercise.stability));
    const totalBreaks = exerciseResults.reduce((acc, exercise) => acc + exercise.breaks, 0);

    const overallScore = clamp(avgStability - totalBreaks * 3, 0, 100);

    const exercisesWithVoiceData = analyses
      .filter((analysis) => analysis.hasVoiceData)
      .map((analysis) => analysis.exerciseResult.avgHz);
    const avgHz = calculateAverage(exercisesWithVoiceData);

    const observations: string[] = [];

    if (overallScore >= 80) {
      observations.push('Buena calidad vocal general');
    }

    if (overallScore < 50) {
      observations.push('Se recomienda consultar a un especialista');
    }

    if (totalBreaks > 3) {
      observations.push('Se detectaron múltiples quiebres vocales');
    }

    if (totalBreaks === 0) {
      observations.push('No se detectaron quiebres vocales');
    }

    for (const exercise of exercises) {
      const resultByExercise = exerciseResults.find((item) => item.exerciseId === exercise.id);

      if (resultByExercise && !resultByExercise.inRange) {
        observations.push(`Frecuencia fuera del rango esperado en: ${exercise.instruction}`);
      }
    }

    const sustainedStabilities = exerciseResults
      .filter((resultByExercise) => {
        const exercise = exercises.find((item) => item.id === resultByExercise.exerciseId);
        return exercise?.type === 'sustained';
      })
      .map((resultByExercise) => resultByExercise.stability);

    const sustainedAverageStability = calculateAverage(sustainedStabilities);
    if (sustainedAverageStability >= 85) {
      observations.push('Buena estabilidad en vocales sostenidas');
    }

    return {
      exercises: exerciseResults,
      overallScore,
      avgHz,
      observations,
      timestamp: Date.now(),
    };
  }, [recordedResults]);

  return { result };
}
