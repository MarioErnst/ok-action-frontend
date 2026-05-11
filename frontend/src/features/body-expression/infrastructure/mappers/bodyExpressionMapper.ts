import type {
  BodyExpressionFeedback,
  BodyExpressionMetrics,
  BodyExpressionSessionListItem,
  BodyExpressionSessionResult,
} from '../../domain/BodyExpression'
import type {
  BodyExpressionFeedbackDto,
  BodyExpressionMetricsDto,
  BodyExpressionSessionListItemDto,
  BodyExpressionSessionResponseDto,
  SaveBodyExpressionSessionDto,
} from '../dto/BodyExpressionDtos'

export function toMetricsDto(metrics: BodyExpressionMetrics): BodyExpressionMetricsDto {
  return {
    posture_score: metrics.postureScore,
    openness_score: metrics.opennessScore,
    gesture_score: metrics.gestureScore,
    stability_score: metrics.stabilityScore,
    energy_score: metrics.energyScore,
    framing_score: metrics.framingScore,
    tracked_pct: metrics.trackedPct,
    hands_visible_pct: metrics.handsVisiblePct,
    excessive_movement_pct: metrics.excessiveMovementPct,
    calibration_quality_pct: metrics.calibrationQualityPct,
    framing_mode: metrics.framingMode,
  }
}

export function toMetrics(dto: BodyExpressionMetricsDto): BodyExpressionMetrics {
  return {
    postureScore: dto.posture_score,
    opennessScore: dto.openness_score,
    gestureScore: dto.gesture_score,
    stabilityScore: dto.stability_score,
    energyScore: dto.energy_score,
    framingScore: dto.framing_score,
    trackedPct: dto.tracked_pct,
    handsVisiblePct: dto.hands_visible_pct,
    excessiveMovementPct: dto.excessive_movement_pct,
    calibrationQualityPct: dto.calibration_quality_pct,
    framingMode: dto.framing_mode,
  }
}

export function toSaveSessionDto(
  startedAt: string,
  endedAt: string,
  promptText: string,
  metrics: BodyExpressionMetrics,
  parentId?: string | null,
): SaveBodyExpressionSessionDto {
  return {
    started_at: startedAt,
    ended_at: endedAt,
    prompt_text: promptText,
    metrics: toMetricsDto(metrics),
    parent_id: parentId ?? null,
  }
}

export function toFeedback(dto: BodyExpressionFeedbackDto): BodyExpressionFeedback {
  return {
    summary: dto.summary,
    strengths: dto.strengths,
    improvements: dto.improvements,
    recommendation: dto.recommendation,
    source: dto.source,
  }
}

export function toSessionResult(dto: BodyExpressionSessionResponseDto): BodyExpressionSessionResult {
  return {
    id: dto.id,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    durationMs: dto.duration_ms,
    score: dto.score,
    status: 'completed',
    metrics: toMetrics(dto.metrics),
    feedback: toFeedback(dto.feedback),
    saved: true,
  }
}

export function toSessionListItem(
  dto: BodyExpressionSessionListItemDto,
): BodyExpressionSessionListItem {
  return {
    id: dto.id,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    durationMs: dto.duration_ms,
    score: dto.score,
    postureScore: dto.posture_score,
    gestureScore: dto.gesture_score,
    stabilityScore: dto.stability_score,
    framingMode: dto.framing_mode,
  }
}
