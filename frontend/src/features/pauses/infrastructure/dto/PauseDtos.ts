// DTOs for the uniform-schema pauses backend. The pauses[] array, the
// classification label and the prompt text are not persisted anymore;
// the frontend keeps them locally for the UI but does not send them.

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

export interface PauseMetricsDto {
  pauses_count: number;
  total_pause_ms: number;
  longest_pause_ms: number;
  silence_pct: number;
}

export interface SavePauseSessionDto {
  started_at: string;
  ended_at: string;
  score: number;
  metrics: PauseMetricsDto;
  parent_id?: string | null;
}

export interface PauseSessionDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  created_at: string;
  metrics: PauseMetricsDto;
}

export interface PauseSessionListItemDto {
  id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  pauses_count: number;
  silence_pct: number;
}
