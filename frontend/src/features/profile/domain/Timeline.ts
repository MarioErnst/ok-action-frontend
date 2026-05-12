// Time-series shape consumed by the dashboard charts. Matches the
// payload of GET /api/profile/timeline; nullability mirrors the backend.

export type TimeRange = '7d' | '30d' | '90d' | 'all';

// Every value of the backend ModuleEnum the dashboard cares about.
// `live` is excluded on purpose: it is a composition wrapper whose score
// is derived from its children, so plotting it standalone is misleading.
export type ModuleSlug =
  | 'phonation'
  | 'loudness'
  | 'accentuation'
  | 'pronunciation'
  | 'muletillas'
  | 'pauses'
  | 'precision'
  | 'linguistic_versatility'
  | 'facial_expression'
  | 'body_expression'
  | 'fluency'
  | 'consistency';

// Selector value used in the chip control. "all" aggregates every module.
export type TimelineModuleFilter = 'all' | ModuleSlug;

export interface TimelinePoint {
  date: string; // ISO yyyy-mm-dd
  avgScore: number | null;
  totalDurationMs: number;
  sessionCount: number;
}

export interface Timeline {
  range: TimeRange;
  module: TimelineModuleFilter;
  daily: TimelinePoint[];
}
