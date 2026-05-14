import type { PauseSessionResult } from '../../types';
import type { SavePauseSessionDto } from '../dto/PauseDtos';

const clampPct = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

// Composite score from the pause metrics. Backend treats score as an
// opaque 0-100 the client computes; we penalize silence ratio (the most
// salient signal) and cap at 100. If the product wants a different
// formula it changes here.
const derivePauseScore = (silenceRatio: number): number =>
  clampPct(100 - silenceRatio * 100);

export function toSavePauseSessionDto(
  result: PauseSessionResult,
  parentId?: string | null,
): SavePauseSessionDto {
  const endedAt = new Date(result.timestamp);
  const startedAt = new Date(result.timestamp - result.durationMs);

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    score: derivePauseScore(result.pauseMetrics.silenceRatio),
    metrics: {
      pauses_count: result.pauseMetrics.totalPauses,
      total_pause_ms: result.pauseMetrics.totalPauseDurationMs,
      longest_pause_ms: result.pauseMetrics.longestPauseMs,
      silence_pct: clampPct(result.pauseMetrics.silenceRatio * 100),
      prompt_id: result.promptId,
    },
    parent_id: parentId ?? null,
  };
}
