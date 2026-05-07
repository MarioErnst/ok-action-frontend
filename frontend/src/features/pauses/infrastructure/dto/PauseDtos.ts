export interface PauseIntervalDto {
  start_ms: number;
  end_ms: number;
  duration_ms: number;
}

export interface PauseMetricsDto {
  total_pauses: number;
  total_pause_duration_ms: number;
  average_pause_ms: number;
  longest_pause_ms: number;
  silence_ratio: number;
  classification: string;
  pauses: PauseIntervalDto[];
}

export interface SavePauseSessionDto {
  prompt_text: string;
  duration_ms: number;
  pause_metrics: PauseMetricsDto;
}

export interface PauseSessionDto extends SavePauseSessionDto {
  id: string;
  created_at: string;
}

export interface PauseSessionListItemDto {
  id: string;
  prompt_text: string;
  duration_ms: number;
  total_pauses: number;
  silence_ratio: number;
  classification: string;
  created_at: string;
}
