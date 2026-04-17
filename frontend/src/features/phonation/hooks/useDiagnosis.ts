import { useMemo } from 'react';
import { VOICE_EXERCISES } from '../services/exercises';
import type { ExerciseResult, PhonationFrame, SessionResult, VoiceExercise } from '../types';

// --- Umbrales basados en literatura científica ---
// Baken & Orlikoff (2000), Teixeira et al. (2013), Praat defaults
const F0_SD_NORMAL_MAX = 3; // Hz — SD normal en vocal sostenida
const F0_SD_PATHOLOGICAL = 5; // Hz — sobre esto es patológico
const BREAK_MIN_DURATION_FRAMES = 3; // frames consecutivos sin voz para contar como quiebre real (~200ms a 15fps)
const GLISSANDO_SMOOTHNESS_GOOD = 90; // umbral de suavidad para glissando

function hasHz(frame: PhonationFrame): frame is PhonationFrame & { hz: number } {
  return frame.hz !== null;
}

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

/**
 * Estabilidad para vocales sostenidas.
 * Basado en F0 SD: normal < 3 Hz, patológico > 5 Hz.
 * Mapea linealmente: 0 Hz SD → 100%, 5+ Hz SD → 0%.
 */
function sustainedStability(hzValues: number[]): number {
  if (hzValues.length === 0) return 0;
  const sd = calculateStandardDeviation(hzValues);
  return clamp(100 - (sd / F0_SD_PATHOLOGICAL) * 100, 0, 100);
}

/**
 * Estabilidad para lectura de frase.
 * Usa el coeficiente de variación (CV) en semitonos para normalizar
 * entre hablantes. Ignora pausas entre palabras — solo analiza
 * los segmentos donde hay voz.
 */
function phraseStability(hzValues: number[]): number {
  if (hzValues.length < 2) return 0;
  // Convertir Hz a semitonos (referencia 1 Hz) para normalizar
  const semitones = hzValues.map((hz) => 12 * Math.log2(hz));
  const sd = calculateStandardDeviation(semitones);
  // SD normal en habla conectada: 2-4 semitonos. Más de 6 es excesivo.
  return clamp(100 - ((sd - 2) / 4) * 50, 0, 100);
}

/**
 * Suavidad de glissando.
 * Ajusta una regresión lineal en semitonos y mide el RMSE de los residuos.
 * Un glissando suave tiene residuos pequeños.
 */
function glissandoSmoothness(hzValues: number[]): number {
  if (hzValues.length < 2) return 0;

  const semitones = hzValues.map((hz) => 12 * Math.log2(hz));
  const n = semitones.length;

  // Regresión lineal: y = mx + b
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

  // RMSE de residuos
  let sumSquaredResiduals = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    sumSquaredResiduals += (semitones[i] - predicted) ** 2;
  }
  const rmse = Math.sqrt(sumSquaredResiduals / n);

  // RMSE < 0.5 semitonos = muy suave (100%), > 3 semitonos = irregular (0%)
  return clamp(100 - (rmse / 3) * 100, 0, 100);
}

/**
 * Cuenta quiebres vocales reales — solo interrupciones involuntarias.
 * Un quiebre requiere al menos BREAK_MIN_DURATION_FRAMES frames sin voz
 * consecutivos DENTRO de un segmento de fonación (no al inicio ni final).
 */
function countRealBreaks(frames: PhonationFrame[], exerciseType: VoiceExercise['type']): number {
  // En lectura de frase, las pausas entre palabras son normales — no contar breaks
  if (exerciseType === 'phrase') return 0;

  // Recortar silencio al inicio y final (onset/offset)
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
  const voicedHzValues = frames.filter(hasHz).map((f) => f.hz);
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

    const exerciseResults = exercises.map((exercise) => {
      const frames = recordedResults.get(exercise.id) ?? [];
      return analyzeExercise(exercise, frames);
    });

    // Score ponderado: vocales sostenidas pesan más (son la medida más fiable clínicamente)
    const sustained = exerciseResults.filter((_, i) => exercises[i].type === 'sustained');
    const phrases = exerciseResults.filter((_, i) => exercises[i].type === 'phrase');
    const glissandos = exerciseResults.filter((_, i) => exercises[i].type === 'glissando');

    const sustainedAvg = calculateAverage(sustained.map((r) => r.stability));
    const phraseAvg = calculateAverage(phrases.map((r) => r.stability));
    const glissandoAvg = calculateAverage(glissandos.map((r) => r.stability));

    // Ponderación: 50% sostenidas, 30% frase, 20% glissando
    const weightedScore =
      sustainedAvg * 0.5 +
      phraseAvg * 0.3 +
      glissandoAvg * 0.2;

    // Penalizar solo breaks reales en sostenidas (los únicos clínicamente relevantes)
    const sustainedBreaks = sustained.reduce((acc, r) => acc + r.breaks, 0);
    const overallScore = clamp(weightedScore - sustainedBreaks * 5, 0, 100);

    const exercisesWithVoice = exerciseResults.filter((r) => r.avgHz > 0);
    const avgHz = calculateAverage(exercisesWithVoice.map((r) => r.avgHz));

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

    if (glissandoAvg >= GLISSANDO_SMOOTHNESS_GOOD) {
      observations.push('Transiciones de tono suaves en glissando');
    } else if (glissandoAvg < 50) {
      observations.push('Irregularidades en las transiciones de tono');
    }

    for (const exerciseResult of exerciseResults) {
      const exercise = exercises.find((e) => e.id === exerciseResult.exerciseId);
      if (exercise && !exerciseResult.inRange && exercise.type === 'sustained') {
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
