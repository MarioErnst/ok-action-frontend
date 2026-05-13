import type { ExerciseResult, SessionResult } from '../../domain/PhonationSession';
import type {
  ExerciseTypeDto,
  PhonationExerciseDto,
  SavePhonationSessionDto,
} from '../dto/PhonationDtos';
import { VOICE_EXERCISES } from '../../services/exercises';
import {
  computeExtendedPhonationMetrics,
  type ExtendedPhonationMetrics,
} from '../../services/extendedMetrics';

// Maps the frontend's three exercise concepts onto the two values the
// backend's exercise_type_enum accepts. Sustained vowels and timed phrases
// are both held tones, so they collapse into holding; pitch slides go to
// gliding. If a future exercise type appears here, add a branch here.
const exerciseTypeForId = (exerciseId: string): ExerciseTypeDto => {
  const exercise = VOICE_EXERCISES.find((e) => e.id === exerciseId);
  if (exercise?.type === 'glissando') return 'gliding';
  return 'holding';
};

const clampPct = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const durationMsForExercise = (exerciseId: string): number => {
  const exercise = VOICE_EXERCISES.find((e) => e.id === exerciseId);
  return exercise?.durationMs ?? 0;
};

// Aggregates extended metrics across the exercises that share an
// exercise_type group. `max_sustained_voicing_ms` is the longest voiced run
// in the group, `weak_phrase_endings_count` sums per-exercise counts, and
// `db_slope` is the duration-weighted average of the per-exercise slopes.
const aggregateExtendedMetrics = (
  exerciseType: ExerciseTypeDto,
  group: ExerciseResult[],
  noiseFloorDb: number,
): ExtendedPhonationMetrics => {
  if (group.length === 0 || !Number.isFinite(noiseFloorDb)) {
    return { maxSustainedVoicingMs: 0, dbSlopeDbPerSec: 0, weakPhraseEndingsCount: 0 };
  }

  const perExercise = group.map((exercise) => {
    const durationMs = durationMsForExercise(exercise.exerciseId);
    return {
      durationMs,
      metrics: computeExtendedPhonationMetrics(exercise.frames, {
        noiseFloorDb,
        totalDurationMs: durationMs,
        // Gliding exercises are voiced throughout (the user slides without
        // stopping), so any silence is a break. Holding includes phrase
        // recitations where natural pauses are normal.
        context: exerciseType === 'gliding' ? 'sustained' : 'speech',
      }),
    };
  });

  const maxSustainedVoicingMs = perExercise.reduce(
    (longest, item) => Math.max(longest, item.metrics.maxSustainedVoicingMs),
    0,
  );
  const weakPhraseEndingsCount = perExercise.reduce(
    (sum, item) => sum + item.metrics.weakPhraseEndingsCount,
    0,
  );

  let weightedSlopeSum = 0;
  let totalWeight = 0;
  for (const item of perExercise) {
    if (item.durationMs <= 0) continue;
    weightedSlopeSum += item.metrics.dbSlopeDbPerSec * item.durationMs;
    totalWeight += item.durationMs;
  }
  const dbSlopeDbPerSec =
    totalWeight === 0 ? 0 : Number((weightedSlopeSum / totalWeight).toFixed(3));

  return { maxSustainedVoicingMs, dbSlopeDbPerSec, weakPhraseEndingsCount };
};

const aggregateGroup = (
  exerciseType: ExerciseTypeDto,
  group: ExerciseResult[],
  noiseFloorDb: number,
): PhonationExerciseDto => {
  const count = group.length;
  const avgHzSum = group.reduce((acc, e) => acc + e.avgHz, 0);
  const stabilitySum = group.reduce((acc, e) => acc + e.stability, 0);
  const breaksSum = group.reduce((acc, e) => acc + e.breaks, 0);
  const inRangeCount = group.filter((e) => e.inRange).length;

  const computedAvgHz = count === 0 ? 0 : avgHzSum / count;
  const extended = aggregateExtendedMetrics(exerciseType, group, noiseFloorDb);
  return {
    exercise_type: exerciseType,
    avg_hz: Number.isNaN(computedAvgHz) ? 0 : computedAvgHz || 0,
    stability_score: count === 0 ? 0 : clampPct(stabilitySum / count),
    breaks_count: breaksSum,
    in_range_pct: count === 0 ? 0 : clampPct((inRangeCount / count) * 100),
    max_sustained_voicing_ms: extended.maxSustainedVoicingMs,
    db_slope: extended.dbSlopeDbPerSec,
    weak_phrase_endings_count: extended.weakPhraseEndingsCount,
  };
};

const groupByBackendType = (
  exercises: ExerciseResult[],
  noiseFloorDb: number,
): PhonationExerciseDto[] => {
  const groups: Record<ExerciseTypeDto, ExerciseResult[]> = {
    holding: [],
    gliding: [],
  };
  for (const exercise of exercises) {
    groups[exerciseTypeForId(exercise.exerciseId)].push(exercise);
  }
  const dtos: PhonationExerciseDto[] = [];
  if (groups.holding.length > 0) {
    dtos.push(aggregateGroup('holding', groups.holding, noiseFloorDb));
  }
  if (groups.gliding.length > 0) {
    dtos.push(aggregateGroup('gliding', groups.gliding, noiseFloorDb));
  }
  return dtos;
};

const totalDurationMs = (): number =>
  VOICE_EXERCISES.reduce((acc, e) => acc + e.durationMs, 0);

export const toSavePhonationSessionDto = (
  result: SessionResult,
  noiseFloorDb: number,
  parentId?: string | null,
): SavePhonationSessionDto => {
  const grouped = groupByBackendType(result.exercises, noiseFloorDb);
  const breaksTotal = grouped.reduce((acc, g) => acc + g.breaks_count, 0);
  const stabilityAvg =
    grouped.length === 0
      ? 0
      : Math.round(
          grouped.reduce((acc, g) => acc + g.stability_score, 0) / grouped.length,
        );

  const endedAt = new Date(result.timestamp);
  const startedAt = new Date(result.timestamp - totalDurationMs());

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    score: clampPct(result.overallScore),
    metrics: {
      avg_hz: Number.isNaN(result.avgHz) ? 0 : result.avgHz || 0,
      stability_score: stabilityAvg,
      breaks_count: breaksTotal,
      exercises_count: grouped.length,
    },
    exercises: grouped,
    parent_id: parentId || undefined,
  };
};
