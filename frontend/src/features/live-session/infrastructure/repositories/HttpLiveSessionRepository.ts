import { apiRequest } from '../../../../api/client'
import type {
  AbandonRequestDto,
  FinalizeSessionResponseDto,
  LiveSessionDetailDto,
  LiveSessionListItemDto,
  StartSessionResponseDto,
} from '../dto/LiveSessionDtos'

// Live composition is HTTP-only: the WebSocket multi-dim orchestrator is
// gone. Each component module session is attached to a live root via
// parent_id when its create call accepts it.
export const HttpLiveSessionRepository = {
  async startSession(): Promise<StartSessionResponseDto> {
    return apiRequest<StartSessionResponseDto>('/live/sessions', {
      method: 'POST',
    })
  },

  async finalizeSession(sessionId: string): Promise<FinalizeSessionResponseDto> {
    return apiRequest<FinalizeSessionResponseDto>(
      `/live/sessions/${sessionId}/finalize`,
      { method: 'POST' },
    )
  },

  async abandonSession(
    sessionId: string,
    stopReason: AbandonRequestDto['stop_reason'] = 'user_stop',
  ): Promise<void> {
    await apiRequest(`/live/sessions/${sessionId}/abandon`, {
      method: 'PATCH',
      body: { stop_reason: stopReason },
    })
  },

  async listSessions(): Promise<LiveSessionListItemDto[]> {
    return apiRequest<LiveSessionListItemDto[]>('/live/sessions')
  },

  async getSession(sessionId: string): Promise<LiveSessionDetailDto> {
    return apiRequest<LiveSessionDetailDto>(`/live/sessions/${sessionId}`)
  },
}
