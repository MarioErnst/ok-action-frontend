// Domain types for live streaming strikes consumed by the hooks/UI.
//
// These are the post-boundary equivalents of LiveStreamDtos: snake_case
// becomes camelCase, the WS-only `type` discriminator is dropped, and
// `category` is reused as the union tag. Keep this file in sync with
// the supervisor's StrikeEvent on the backend.

import type {
  LiveStreamModule,
  LiveStreamSeverity,
  StrikeMessageDto,
} from '../infrastructure/dto/LiveStreamDtos'


export type StreamingStrikeCategory = LiveStreamModule


export interface StreamingStrikeEvent {
  category: StreamingStrikeCategory
  word: string
  transcriptSnippet: string
  severity: LiveStreamSeverity
  receivedAtMs: number
}


export function strikeFromDto(message: StrikeMessageDto): StreamingStrikeEvent {
  return {
    category: message.category,
    word: message.word,
    transcriptSnippet: message.transcript_snippet,
    severity: message.severity,
    receivedAtMs: message.received_at_ms,
  }
}
