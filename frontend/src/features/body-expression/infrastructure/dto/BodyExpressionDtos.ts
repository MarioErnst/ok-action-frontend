import type { BodyFramingMode } from '../../domain/BodyExpression'

export type BodyExpressionSessionStatusDto = 'active' | 'completed' | 'aborted'

export interface BodyExpressionMetricsDto {
  posture_score: number
  openness_score: number
  gesture_score: number
  stability_score: number
  energy_score: number
  framing_score: number
  tracked_pct: number
  hands_visible_pct: number
  excessive_movement_pct: number
  calibration_quality_pct: number
  framing_mode: BodyFramingMode
}

export type BodyExpressionMetricsInputDto = BodyExpressionMetricsDto

export interface BodyExpressionFeedbackDto {
  summary: string
  strengths: string[]
  improvements: string[]
  recommendation: string
  source: 'gemini' | 'rules'
}

export interface SaveBodyExpressionSessionDto {
  started_at: string
  ended_at: string
  prompt_text?: string | null
  metrics: BodyExpressionMetricsInputDto
  parent_id?: string | null
}

export interface BodyExpressionSessionResponseDto {
  id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_ms: number
  score: number
  status: BodyExpressionSessionStatusDto
  created_at: string
  metrics: BodyExpressionMetricsDto
  feedback: BodyExpressionFeedbackDto
}

export interface BodyExpressionSessionListItemDto {
  id: string
  started_at: string
  ended_at: string
  duration_ms: number
  score: number
  status: BodyExpressionSessionStatusDto
  posture_score: number
  gesture_score: number
  stability_score: number
  framing_mode: BodyFramingMode
}

export type BodyExpressionSessionListDto = BodyExpressionSessionListItemDto[]
