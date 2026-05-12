import { useMemo } from 'react';
import { VOICE_EXERCISES } from '../../services/exercises';
import type { ExerciseResult, PhonationFrame, SessionResult, VoiceExercise } from '../../domain/PhonationSession';

// --- Thresholds based on scientific literature ---
const F0_SD_PATHOLOGICAL = 15;
const BREAK_MIN_DURATION_FRAMES = 3;
const GLISSANDO_SMOOTHNESS_GOOD = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateAverage(values);
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function sustainedStability(hzValues: number[]): number {
  if (hzValues.length === 0) return 0;
  
  // Remove outliers that inflate standard deviation (typical YIN errors such as octave jumps)
  const mean = calculateAverage(hzValues);
  const cleanValues = hzValues.filter(hz => Math.abs(hz - mean) < mean * 0.3); // Exclude variations > 30% of the mean
  
  if (cleanValues.length < 2) return 0;
  
  const sd = calculateStandardDeviation(cleanValues);
  return clamp(100 - (sd / F0_SD_PATHOLOGICAL) * 100, 0, 100);
}

function phraseStability(hzValues: number[]): number {
  if (hzValues.length < 2) return 0;
  const semitones = hzValues.map((hz) => 12 * Math.log2(hz));
  const sd = calculateStandardDeviation(semitones);
  return clamp(100 - ((sd - 2) / 4) * 50, 0, 100);
}

function glissandoSmoothness(hzValues: number[]): number {
  if (hzValues.length < 2) return 0;

  const semitones = hzValues.map((hz) => 12 * Math.log2(hz));
  const n = semitones.length;

  const xMean = (n - 1) / 2;
  const yMean = calculateAverage(semitones);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (semitones[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  let sumSquaredResiduals = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    sumSquaredResiduals += (semitones[i] - predicted) ** 2;
  }
  const rmse = Math.sqrt(sumSquaredResiduals / n);

  return clamp(100 - (rmse / 3) * 100, 0, 100);
}

function countRealBreaks(frames: PhonationFrame[], exerciseType: VoiceExercise['type']): number {
  if (exerciseType === 'phrase') return 0;

  let firstVoiced = -1;
  let lastVoiced = -1;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].hz !== null) {
      if (firstVoiced === -1) firstVoiced = i;
      lastVoiced = i;
    }
  }

  if (firstVoiced === -1 || lastVoiced === -1) return 0;

  let breaks = 0;
  let silentStreak = 0;

  for (let i = firstVoiced; i <= lastVoiced; i++) {
    if (frames[i].hz === null) {
      silentStreak++;
    } else {
      if (silentStreak >= BREAK_MIN_DURATION_FRAMES) {
        breaks++;
      }
      silentStreak = 0;
    }
  }

  return breaks;
}

function analyzeExercise(exercise: VoiceExercise, frames: PhonationFrame[]): ExerciseResult {
  // Filter out null values and hz <= 0 to avoid invalid frames
  const voicedHzValues = frames.filter(f => f.hz !== null && f.hz > 0).map((f) => f.hz!);
  const avgHz = calculateAverage(voicedHzValues);

  let stability: number;
  switch (exercise.type) {
    case 'sustained':
      stability = sustainedStability(voicedHzValues);
      break;
    case 'phrase':
      stability = phraseStability(voicedHzValues);
      break;
    case 'glissando':
      stability = glissandoSmoothness(voicedHzValues);
      break;
  }

  const breaks = countRealBreaks(frames, exercise.type);
  const inRange = voicedHzValues.length > 0 && avgHz >= exercise.targetHzRange.min && avgHz <= exercise.targetHzRange.max;

  return {
    exerciseId: exercise.id,
    frames,
    avgHz,
    stability,
    breaks,
    inRange,
  };
}

export default function useDiagnosis(
  recordedResults: Map<string, PhonationFrame[]>,
  exercises: VoiceExercise[] = VOICE_EXERCISES,
): { result: SessionResult | null } {
  const result = useMemo<SessionResult | null>(() => {
    if (recordedResults.size === 0) return null;

    // Only exercises with actual recorded data
    const activeExercises = exercises.filter((e) => {
      const frames = recordedResults.get(e.id);
      return frames && frames.length > 0;
    });
    
    if (activeExercises.length === 0) return null;

    const exerciseResults = activeExercises.map((exercise) => {
      const frames = recordedResults.get(exercise.id)!;
      return analyzeExercise(exercise, frames);
    });

    // Filter by exerciseId instead of array index
    const sustained = exerciseResults.filter((r) => {
      const ex = activeExercises.find(e => e.id === r.exerciseId);
      return ex?.type === 'sustained';
    });
    
    const phrases = exerciseResults.filter((r) => {
      const ex = activeExercises.find(e => e.id === r.exerciseId);
      return ex?.type === 'phrase';
    });
    
    const glissandos = exerciseResults.filter((r) => {
      const ex = activeExercises.find(e => e.id === r.exerciseId);
      return ex?.type === 'glissando';
    });

    const sustainedAvg = sustained.length > 0 ? calculateAverage(sustained.map((r) => r.stability)) : 0;
    const phraseAvg = phrases.length > 0 ? calculateAverage(phrases.map((r) => r.stability)) : 0;
    const glissandoAvg = glissandos.length > 0 ? calculateAverage(glissandos.map((r) => r.stability)) : 0;

    let totalWeight = 0;
    let weightedSum = 0;

    if (sustained.length > 0) {
      weightedSum += sustainedAvg * 0.5;
      totalWeight += 0.5;
    }
    if (phrases.length > 0) {
      weightedSum += phraseAvg * 0.3;
      totalWeight += 0.3;
    }
    if (glissandos.length > 0) {
      weightedSum += glissandoAvg * 0.2;
      totalWeight += 0.2;
    }

    const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const sustainedBreaks = sustained.reduce((acc, r) => acc + r.breaks, 0);
    const overallScore = clamp(weightedScore - sustainedBreaks * 5, 0, 100);

    const exercisesWithVoice = exerciseResults.filter((r) => r.avgHz > 0);
    const avgHz = exercisesWithVoice.length > 0 
      ? calculateAverage(exercisesWithVoice.map((r) => r.avgHz)) 
      : 0;

    const observations: string[] = [];

    if (overallScore >= 80) {
      observations.push('Buena calidad vocal general');
    } else if (overallScore >= 60) {
      observations.push('Calidad vocal dentro de parámetros aceptables');
    } else if (overallScore >= 40) {
      observations.push('Se observan algunas irregularidades vocales');
    } else {
      observations.push('Se recomienda consultar a un especialista');
    }

    if (sustained.length > 0) {
      if (sustainedBreaks > 0) {
        observations.push(
          sustainedBreaks === 1
            ? 'Se detectó 1 quiebre vocal en fonación sostenida'
            : `Se detectaron ${sustainedBreaks} quiebres vocales en fonación sostenida`,
        );
      } else {
        observations.push('No se detectaron quiebres vocales');
      }

      if (sustainedAvg >= 85) {
        observations.push('Buena estabilidad en vocales sostenidas');
      } else if (sustainedAvg < 50) {
        observations.push('Inestabilidad significativa en vocales sostenidas');
      }
    }

    if (glissandos.length > 0) {
      if (glissandoAvg >= GLISSANDO_SMOOTHNESS_GOOD) {
        observations.push('Transiciones de tono suaves en glissando');
      } else if (glissandoAvg < 50) {
        observations.push('Irregularidades en las transiciones de tono');
      }
    }

    for (const exerciseResult of exerciseResults) {
      const exercise = activeExercises.find((e) => e.id === exerciseResult.exerciseId);
      if (exercise && exerciseResult.avgHz > 0 && !exerciseResult.inRange && exercise.type === 'sustained') {
        observations.push(`Frecuencia fuera del rango esperado en: ${exercise.instruction}`);
      }
    }

    return {
      exercises: exerciseResults,
      overallScore,
      avgHz,
      observations,
      timestamp: Date.now(),
    };
  }, [recordedResults, exercises]);

  return { result };
}