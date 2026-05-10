import type { ExerciseResult, SessionResult } from '../../domain/PhonationSession';
import type {
  ExerciseTypeDto,
  PhonationExerciseDto,
  SavePhonationSessionDto,
} from '../dto/PhonationDtos';
import { VOICE_EXERCISES } from '../../services/exercises';

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

const aggregateGroup = (
  exerciseType: ExerciseTypeDto,
  group: ExerciseResult[],
): PhonationExerciseDto => {
  const count = group.length;
  const avgHzSum = group.reduce((acc, e) => acc + e.avgHz, 0);
  const stabilitySum = group.reduce((acc, e) => acc + e.stability, 0);
  const breaksSum = group.reduce((acc, e) => acc + e.breaks, 0);
  const inRangeCount = group.filter((e) => e.inRange).length;

  return {
    exercise_type: exerciseType,
    avg_hz: count === 0 ? 0 : avgHzSum / count,
    stability_score: count === 0 ? 0 : clampPct(stabilitySum / count),
    breaks_count: breaksSum,
    in_range_pct: count === 0 ? 0 : clampPct((inRangeCount / count) * 100),
  };
};

const groupByBackendType = (
  exercises: ExerciseResult[],
): PhonationExerciseDto[] => {
  const groups: Record<ExerciseTypeDto, ExerciseResult[]> = {
    holding: [],
    gliding: [],
  };
  for (const exercise of exercises) {
    groups[exerciseTypeForId(exercise.exerciseId)].push(exercise);
  }
  const dtos: PhonationExerciseDto[] = [];
  if (groups.holding.length > 0) dtos.push(aggregateGroup('holding', groups.holding));
  if (groups.gliding.length > 0) dtos.push(aggregateGroup('gliding', groups.gliding));
  return dtos;
};

const totalDurationMs = (): number =>
  VOICE_EXERCISES.reduce((acc, e) => acc + e.durationMs, 0);

export const toSavePhonationSessionDto = (
  result: SessionResult,
  parentId?: string | null,
): SavePhonationSessionDto => {
  const grouped = groupByBackendType(result.exercises);
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
      avg_hz: result.avgHz,
      stability_score: stabilityAvg,
      breaks_count: breaksTotal,
      exercises_count: grouped.length,
    },
    exercises: grouped,
    parent_id: parentId ?? null,
  };
};
