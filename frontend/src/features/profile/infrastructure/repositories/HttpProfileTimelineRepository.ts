import { apiRequest } from '../../../../api/client';
import type { Timeline, TimelineModuleFilter, TimeRange } from '../../domain/Timeline';
import type { TimelineDto } from '../dto/TimelineDto';
import { toTimeline } from '../mappers/timelineMapper';

interface FetchTimelineArgs {
  range: TimeRange;
  module: TimelineModuleFilter;
  signal?: AbortSignal;
}

export const HttpProfileTimelineRepository = {
  async fetchTimeline({ range, module, signal }: FetchTimelineArgs): Promise<Timeline> {
    const params = new URLSearchParams({ range, module });
    const dto = await apiRequest<TimelineDto>(
      `/profile/timeline?${params.toString()}`,
      { signal },
    );
    return toTimeline(dto);
  },
};
