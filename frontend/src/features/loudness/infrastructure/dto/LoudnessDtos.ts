export interface LoudnessPresetDto {
  id: string;
  label: string;
  description: string | null;
  silence_offset_db: number;
  too_low_offset_db: number;
  optimal_offset_db: number;
  clip_threshold_dbfs: number;
  is_default: boolean;
}

export interface CreateLoudnessPresetDto {
  label: string;
  description?: string | null;
  silence_offset_db: number;
  too_low_offset_db: number;
  optimal_offset_db: number;
  clip_threshold_dbfs: number;
}

export interface UpdateLoudnessPresetDto {
  label?: string;
  description?: string | null;
  silence_offset_db?: number;
  too_low_offset_db?: number;
  optimal_offset_db?: number;
  clip_threshold_dbfs?: number;
}

export interface LoudnessSessionDto {
  id: string;
  preset_id: string;
  duration_ms: number;
  optimal_percent: number;
  peak_db: number;
  band_time_ms: Record<string, number>;
  created_at: string;
}

export interface LoudnessSessionListItemDto {
  id: string;
  preset_id: string;
  optimal_percent: number;
  duration_ms: number;
  created_at: string;
}

export interface SaveLoudnessSessionDto {
  preset_id: string;
  duration_ms: number;
  optimal_percent: number;
  peak_db: number;
  band_time_ms: Record<string, number>;
}
