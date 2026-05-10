import type {
  EmotionEvent,
  EmotionId,
  SessionListItem,
  SessionResult,
} from '../../domain/FacialExpression';
import type {
  BackendEmotionId,
  FacialExpressionMetricsInputDto,
  SaveSessionDto,
  SessionListItemDto,
  SessionResponseDto,
} from '../dto/FacialExpressionDtos';

// The frontend keeps the legacy English-Spanish-loaded names (surprise/
// fear/disgust) across the classifier, styles and components; the
// backend ENUM uses the -ed forms. Translate at this boundary only.
const FRONT_TO_BACK: Record<EmotionId, BackendEmotionId> = {
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprise: 'surprised',
  fear: 'fearful',
  disgust: 'disgusted',
  neutral: 'neutral',
};

const BACK_TO_FRONT: Record<BackendEmotionId, EmotionId> = {
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprised: 'surprise',
  fearful: 'fear',
  disgusted: 'disgust',
  neutral: 'neutral',
};

const EMOTION_KEYS: EmotionId[] = [
  'happy',
  'sad',
  'angry',
  'surprise',
  'fear',
  'disgust',
  'neutral',
];

// Compute time spent per emotion from the event timeline. Each event marks
// the moment a new dominant emotion took over; the gap to the next event
// (or to the end of the session) is the time spent in the previous one.
// Mirrors the algorithm the backend used to run before this column moved
// to the client.
function timePerEmotion(
  durationMs: number,
  events: EmotionEvent[],
): Record<EmotionId, number> {
  const time: Record<EmotionId, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprise: 0,
    fear: 0,
    disgust: 0,
    neutral: 0,
  };
  if (events.length === 0 || durationMs <= 0) return time;

  const sorted = [...events].sort((a, b) => a.t_ms - b.t_ms);
  for (let i = 0; i < sorted.length; i += 1) {
    const start = sorted[i].t_ms;
    const end = i + 1 < sorted.length ? sorted[i + 1].t_ms : durationMs;
    const elapsed = Math.max(0, end - start);
    time[sorted[i].emotion] += elapsed;
  }
  return time;
}

// Largest-remainder rounding so the seven percentages sum to exactly 100,
// matching the backend's sum-to-100 CHECK constraint.
function normalizeToHundred(values: Record<EmotionId, number>): Record<EmotionId, number> {
  const total = EMOTION_KEYS.reduce((acc, key) => acc + values[key], 0);
  if (total <= 0) {
    return {
      happy: 0,
      sad: 0,
      angry: 0,
      surprise: 0,
      fear: 0,
      disgust: 0,
      neutral: 100,
    };
  }
  const raw = EMOTION_KEYS.map((key) => ({
    key,
    value: (values[key] / total) * 100,
  }));
  const floored = raw.map((entry) => ({
    key: entry.key,
    floor: Math.floor(entry.value),
    fractional: entry.value - Math.floor(entry.value),
  }));
  const result: Record<EmotionId, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprise: 0,
    fear: 0,
    disgust: 0,
    neutral: 0,
  };
  let running = 0;
  for (const entry of floored) {
    result[entry.key] = entry.floor;
    running += entry.floor;
  }
  const sortedByFraction = [...floored].sort((a, b) => b.fractional - a.fractional);
  let i = 0;
  while (running < 100) {
    const entry = sortedByFraction[i % sortedByFraction.length];
    result[entry.key] += 1;
    running += 1;
    i += 1;
  }
  return result;
}

export function toSaveSessionDto(
  durationMs: number,
  events: EmotionEvent[],
  parentId?: string | null,
): SaveSessionDto {
  const time = timePerEmotion(durationMs, events);
  const pcts = normalizeToHundred(time);
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - durationMs);

  const metrics: FacialExpressionMetricsInputDto = {
    happy_pct: pcts.happy,
    sad_pct: pcts.sad,
    angry_pct: pcts.angry,
    surprised_pct: pcts.surprise,
    fearful_pct: pcts.fear,
    disgusted_pct: pcts.disgust,
    neutral_pct: pcts.neutral,
  };

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    metrics,
    parent_id: parentId ?? null,
  };
}

export function toSessionResult(dto: SessionResponseDto): SessionResult {
  const dominant = BACK_TO_FRONT[dto.metrics.top_emotion];
  // The detail response carries the raw 7 pct; expose them in the legacy
  // emotion_distribution shape the UI already renders.
  const distribution: Partial<Record<EmotionId, number>> = {
    happy: dto.metrics.happy_pct,
    sad: dto.metrics.sad_pct,
    angry: dto.metrics.angry_pct,
    surprise: dto.metrics.surprised_pct,
    fear: dto.metrics.fearful_pct,
    disgust: dto.metrics.disgusted_pct,
    neutral: dto.metrics.neutral_pct,
  };
  return {
    id: dto.id,
    duration_ms: dto.duration_ms,
    dominant_emotion: dominant,
    dominant_percentage: distribution[dominant] ?? null,
    emotion_distribution: distribution,
    created_at: dto.created_at,
    events: [],
  };
}

export function toSessionListItem(dto: SessionListItemDto): SessionListItem {
  return {
    id: dto.id,
    duration_ms: dto.duration_ms,
    dominant_emotion: BACK_TO_FRONT[dto.top_emotion],
    dominant_percentage: dto.expressiveness_score,
    // Backend list endpoint exposes started_at, not created_at; use that
    // as the timeline-display timestamp.
    created_at: dto.started_at,
  };
}

// Re-exported so the unused import warning never fires when only one
// direction is needed at a callsite.
export const _FRONT_TO_BACK = FRONT_TO_BACK;
