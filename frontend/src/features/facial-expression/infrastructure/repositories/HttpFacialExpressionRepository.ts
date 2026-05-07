import { apiRequest } from '../../../../api/client'
import type { SaveSessionDto, SessionResponseDto, SessionListDto } from '../dto/FacialExpressionDtos'

// apiRequest from the shared client handles auth_token from localStorage and
// the three-level API base URL resolution automatically.
export const HttpFacialExpressionRepository = {
  async saveSession(data: SaveSessionDto): Promise<SessionResponseDto> {
    return apiRequest<SessionResponseDto>('/facial-expression/sessions', {
      method: 'POST',
      body: data,
    })
  },

  async listSessions(): Promise<SessionListDto> {
    return apiRequest<SessionListDto>('/facial-expression/sessions')
  },

  async getSession(sessionId: string): Promise<SessionResponseDto> {
    return apiRequest<SessionResponseDto>(`/facial-expression/sessions/${sessionId}`)
  },
}
