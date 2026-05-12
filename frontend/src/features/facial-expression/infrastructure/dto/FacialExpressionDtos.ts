// DTOs for the uniform-schema facial_expression backend. Sessions now
// carry only the seven aggregated percentages plus expressiveness_score
// and top_emotion, all derived in the server (top_emotion as the max,
// expressiveness_score as 100 - neutral_pct). The mapper converts the
// frontend's event timeline into those seven percentages before sending.

export type SessionStatusDto = 'active' | 'completed' | 'aborted';

// Backend emotion names match the top_emotion_enum exactly. Frontend
// internal ids stay surprise/fear/disgust because the rest of the UI
// (classifier, styles, components) is built on those; the mapper does
// the translation at the boundary.
export type BackendEmotionId =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'fearful'
  | 'disgusted'
  | 'neutral';

export interface FacialExpressionMetricsDto {
  happy_pct: number;
  sad_pct: number;
  angry_pct: number;
  surprised_pct: number;
  fearful_pct: number;
  disgusted_pct: number;
  neutral_pct: number;
  expressiveness_score: number;
  top_emotion: BackendEmotionId;
}

export interface FacialExpressionMetricsInputDto {
  happy_pct: number;
  sad_pct: number;
  angry_pct: number;
  surprised_pct: number;
  fearful_pct: number;
  disgusted_pct: number;
  neutral_pct: number;
}

export interface SaveSessionDto {
  started_at: string;
  ended_at: string;
  metrics: FacialExpressionMetricsInputDto;
  parent_id?: string | null;
}

export interface SessionResponseDto {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  created_at: string;
  metrics: FacialExpressionMetricsDto;
}

export interface SessionListItemDto {
  id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  score: number;
  status: SessionStatusDto;
  top_emotion: BackendEmotionId;
  expressiveness_score: number;
}

export type SessionListDto = SessionListItemDto[];
