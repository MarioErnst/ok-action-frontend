// DTOs that match the uniform-schema loudness backend exactly. The four
// _pct fields on the session metrics (optimal/low/high/clipping) replace
// the old band_time_ms JSONB; the mapper normalizes the frontend's
// per-band millisecond breakdown into integer percentages that sum to 100.

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

export interface LoudnessPresetDto {
  id: string;
  label: string;
  description: string | null;
  silence_offset_db: number;
  low_offset_db: number;
  optimal_offset_db: number;
  clip_threshold_db: number;
  is_default: boolean;
  is_global: boolean;
}

export interface CreateLoudnessPresetDto {
  label: string;
  description?: string | null;
  silence_offset_db: number;
  low_offset_db: number;
  optimal_offset_db: number;
  clip_threshold_db: number;
}

export interface UpdateLoudnessPresetDto {
  label?: string;
  description?: string | null;
  silence_offset_db?: number;
  low_offset_db?: number;
  optimal_offset_db?: number;
  clip_threshold_db?: number;
}

export interface LoudnessMetricsDto {
  preset_id: string;
  optimal_pct: number;
  low_pct: number;
  high_pct: number;
  clipping_pct: number;
  peak_db: number;
}

export interface SaveLoudnessSessionDto {
  started_at: string;
  ended_at: string;
  metrics: LoudnessMetricsDto;
  parent_id?: string | null;
}

export interface LoudnessSessionDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  created_at: string;
  metrics: LoudnessMetricsDto;
}

export interface LoudnessSessionListItemDto {
  id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  optimal_pct: number;
  preset_id: string;
}
