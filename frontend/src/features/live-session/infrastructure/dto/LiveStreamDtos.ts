// DTOs of the live streaming WebSocket protocol (frontend side).
//
// The backend sends control frames as JSON and audio is never delivered
// downstream — only outgoing. Names mirror the supervisor's strike
// event so the boundary translation is trivial.

export type LiveStreamModule = 'muletillas' | 'pronunciation' | 'accentuation'

export type LiveStreamSeverity = 'low' | 'medium' | 'high'

export interface StrikeMessageDto {
  type: 'strike'
  category: LiveStreamModule
  word: string
  transcript_snippet: string
  severity: LiveStreamSeverity
  received_at_ms: number
}

export interface ReadyMessageDto {
  type: 'ready'
}

export interface SessionEndedMessageDto {
  type: 'session_ended'
}

export interface ErrorMessageDto {
  type: 'error'
  reason: string
}

export type LiveStreamServerMessage =
  | ReadyMessageDto
  | StrikeMessageDto
  | SessionEndedMessageDto
  | ErrorMessageDto
