import type {
  Baseline,
  QuestionPayload,
  SessionResult,
  SessionListItem,
} from '../../domain/FacialExpression'

export interface SaveSessionDto {
  baseline: Baseline;
  questions: QuestionPayload[];
}

export type SessionResponseDto = SessionResult;
export type SessionListDto = SessionListItem[];
