import type { ComposedEvaluation, LiveModule } from '../../domain/LiveSession'
import type { FacialSummaryPayload } from '../../domain/FacialSummary'
import type {
  LoudnessSummaryDto,
  PhonationSummaryDto,
} from './LiveAudioSummaries'

// DTOs for the uniform-schema live backend. Live is now an HTTP
// composition lifecycle (start / finalize / abandon / list / get) over
// a sessions(module='live') row plus a 1:1 live_metrics row created
// only at close. Composition is observed through children sessions
// (parent_id IS NOT NULL).

export type SessionStatusDto = 'active' | 'completed' | 'aborted'

export type StopReasonDto =
  | 'user_stop'
  | 'time_limit'
  | 'error'
  | 'completed'
  | 'auto_stop_strikes'
  | 'auto_stop_emotion'
  | 'auto_stop_loudness'
  | 'auto_stop_phonation'

export type AutoStopReasonDto =
  | 'auto_stop_strikes'
  | 'auto_stop_emotion'
  | 'auto_stop_loudness'
  | 'auto_stop_phonation'

export interface AbandonRequestDto {
  stop_reason: 'user_stop' | 'time_limit' | 'error'
}

export interface FinalizeRequestDto {
  auto_stop_reason?: AutoStopReasonDto | null
}

export interface StartSessionResponseDto {
  session_id: string
  started_at: string
}

export interface FinalizeSessionResponseDto {
  session_id: string
  status: 'completed' | 'aborted'
  score: number | null
  children_count: number
  stop_reason: 'completed' | AutoStopReasonDto
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

// Output of POST /live/sessions/{id}/audio-evaluation. children mirrors
// the freshly created session rows (one per requested module) and
// evaluation is the raw Gemini response so the summary screen can render
// per-module feedback without extra GETs.
export interface ComposedAudioEvaluationResponseDto {
  audio_intelligible: boolean
  children: LiveChildOutputDto[]
  evaluation: ComposedEvaluation
}

// Multipart payload for audio-evaluation. modules is sent as repeated
// form fields (modules=muletillas&modules=phonation...) which FastAPI
// parses as list[str] natively. Each *Summary field is required when
// its corresponding module is selected and ignored otherwise.
export interface ComposedAudioEvaluationRequestDto {
  audio: Blob
  modules: LiveModule[]
  startedAt: string
  promptText?: string
  facialSummary?: FacialSummaryPayload
  phonationSummary?: PhonationSummaryDto
  loudnessSummary?: LoudnessSummaryDto
}
