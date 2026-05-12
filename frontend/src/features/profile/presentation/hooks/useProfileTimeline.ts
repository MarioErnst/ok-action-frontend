import { useQuery } from '@tanstack/react-query';

import type { Timeline, TimelineModuleFilter, TimeRange } from '../../domain/Timeline';
import { HttpProfileTimelineRepository } from '../../infrastructure/repositories/HttpProfileTimelineRepository';

interface UseProfileTimelineArgs {
  range: TimeRange;
  module: TimelineModuleFilter;
}

export const useProfileTimeline = ({ range, module }: UseProfileTimelineArgs) =>
  useQuery<Timeline>({
    queryKey: ['profile-timeline', range, module],
    queryFn: ({ signal }) =>
      HttpProfileTimelineRepository.fetchTimeline({ range, module, signal }),
    // The dashboard switches range/module rapidly; keep previous data
    // mounted so charts do not flash empty between fetches.
    staleTime: 60_000,
  });
