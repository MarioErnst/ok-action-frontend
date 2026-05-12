import type { Timeline, TimelineModuleFilter } from '../../domain/Timeline';
import type { TimelineDto } from '../dto/TimelineDto';

export const toTimeline = (dto: TimelineDto): Timeline => ({
  range: dto.range,
  module: dto.module as TimelineModuleFilter,
  daily: dto.daily.map((point) => ({
    date: point.date,
    avgScore: point.avg_score,
    totalDurationMs: point.total_duration_ms,
    sessionCount: point.session_count,
  })),
});
