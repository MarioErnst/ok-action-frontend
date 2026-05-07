import type {
  EmotionEvent,
  SessionListItem,
  SessionResult,
} from '../../domain/FacialExpression'

export interface SaveSessionDto {
  duration_ms: number
  events: EmotionEvent[]
}

export type SessionResponseDto = SessionResult
export type SessionListDto = SessionListItem[]
