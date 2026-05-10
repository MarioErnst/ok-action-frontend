// DTOs for the uniform-schema live backend. Live is now an HTTP
// composition lifecycle (start / finalize / abandon / list / get) over
// a sessions(module='live') row plus a 1:1 live_metrics row created
// only at close. Composition is observed through children sessions
// (parent_id IS NOT NULL).

export type SessionStatusDto = 'active' | 'completed' | 'aborted'

export type StopReasonDto = 'user_stop' | 'time_limit' | 'error' | 'completed'

export interface AbandonRequestDto {
  stop_reason: 'user_stop' | 'time_limit' | 'error'
}

export interface StartSessionResponseDto {
  session_id: string
  started_at: string
}

export interface FinalizeSessionResponseDto {
  session_id: string
  status: 'completed'
  score: number | null
  children_count: number
}

export interface LiveChildOutputDto {
  id: string
  module: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  score: number | null
  status: SessionStatusDto
}

export interface LiveMetricsOutputDto {
  stop_reason: StopReasonDto
}

export interface LiveSessionDetailDto {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  score: number | null
  status: SessionStatusDto
  created_at: string
  metrics: LiveMetricsOutputDto | null
  children: LiveChildOutputDto[]
}

export interface LiveSessionListItemDto {
  id: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  score: number | null
  status: SessionStatusDto
  children_count: number
  stop_reason: StopReasonDto | null
}
