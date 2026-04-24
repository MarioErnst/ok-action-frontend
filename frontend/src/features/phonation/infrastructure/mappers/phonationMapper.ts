import type { SessionResult } from '../../types';
import type { SavePhonationSessionDto } from '../dto/PhonationDtos';

const getExerciseType = (exerciseId: string): string => {
  if (exerciseId.startsWith('sustained')) return 'sustained';
  if (exerciseId.startsWith('phrase')) return 'phrase';
  if (exerciseId.startsWith('glissando')) return 'glissando';
  return 'unknown';
};

export const toSavePhonationSessionDto = (result: SessionResult): SavePhonationSessionDto => ({
  overall_score: result.overallScore,
  avg_hz: result.avgHz,
  observations: result.observations,
  exercises: result.exercises.map((e) => ({
    exercise_id: e.exerciseId,
    exercise_type: getExerciseType(e.exerciseId),
    avg_hz: e.avgHz,
    stability: e.stability,
    breaks: e.breaks,
    in_range: e.inRange,
  })),
});
