import { apiRequest } from '../../../../api/client'
import type { LiveSessionListItemDto } from '../dto/LiveSessionDtos'

export const HttpLiveSessionRepository = {
  async listSessions(): Promise<LiveSessionListItemDto[]> {
    return apiRequest<LiveSessionListItemDto[]>('/live/sessions')
  },
}
