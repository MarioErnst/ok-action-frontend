// DTOs that match the uniform-schema phonation backend exactly. The internal
// PhonationSession domain has more granular concepts (5 exercise ids across
// sustained/phrase/glissando types); the mapper aggregates that into the two
// types Postgres' exercise_type_enum allows.

export type ExerciseTypeDto = 'holding' | 'gliding';

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

export interface PhonationExerciseDto {
  exercise_type: ExerciseTypeDto;
  avg_hz: number;
  stability_score: number;
  breaks_count: number;
  in_range_pct: number;
  // Extended metrics — optional so legacy sessions still serialize cleanly.
  max_sustained_voicing_ms?: number | null;
  db_slope?: number | null;
  weak_phrase_endings_count?: number | null;
}

export interface PhonationMetricsDto {
  avg_hz: number;
  stability_score: number;
  breaks_count: number;
  exercises_count: number;
}

export interface SavePhonationSessionDto {
  started_at: string;
  ended_at: string;
  score: number;
  metrics: PhonationMetricsDto;
  exercises: PhonationExerciseDto[];
  parent_id?: string | null;
}

export interface PhonationSessionDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  created_at: string;
  metrics: PhonationMetricsDto;
  exercises: PhonationExerciseDto[];
}

export interface PhonationSessionListItemDto {
  id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  avg_hz: number;
}
