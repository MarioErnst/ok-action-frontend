// Wire format for GET /api/profile/timeline. Mirrors the Pydantic
// schema in app.presentation.schemas.profile on the backend side.

import type { TimeRange } from '../../domain/Timeline';

export interface TimelinePointDto {
  date: string;
  avg_score: number | null;
  total_duration_ms: number;
  session_count: number;
}

export interface TimelineDto {
  range: TimeRange;
  module: string;
  daily: TimelinePointDto[];
}
