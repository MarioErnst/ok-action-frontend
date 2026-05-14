// DTOs for the uniform-schema pauses backend. The pauses[] array and the
// classification label are not persisted; the frontend keeps them locally
// for the UI but does not send them. prompt_id (since migration 0006)
// identifies which catalog prompt the user practised on, so the backend
// can drive longitudinal analytics by prompt.

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

export interface PausePromptDto {
  id: string;
  text: string;
}

export interface PauseMetricsDto {
  pauses_count: number;
  total_pause_ms: number;
  longest_pause_ms: number;
  silence_pct: number;
  prompt_id?: string | null;
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
