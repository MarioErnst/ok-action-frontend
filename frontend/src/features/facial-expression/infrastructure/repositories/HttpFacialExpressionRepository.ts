import { apiRequest } from '../../../../api/client'
import type { SaveSessionDto, SessionResponseDto, SessionListDto } from '../dto/FacialExpressionDtos'

// Save can carry several thousand frames — a slow connection can take a while,
// but anything past 30s indicates the backend is hung. Bound the wait so the
// "Guardando..." spinner cannot loop forever.
const SAVE_TIMEOUT_MS = 30_000

// apiRequest from the shared client handles auth_token from localStorage and
// the three-level API base URL resolution automatically.
export const HttpFacialExpressionRepository = {
  async saveSession(data: SaveSessionDto): Promise<SessionResponseDto> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
      return await apiRequest<SessionResponseDto>('/facial-expression/sessions', {
        method: 'POST',
        body: data,
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al guardar la sesión.')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  },

  async listSessions(): Promise<SessionListDto> {
    return apiRequest<SessionListDto>('/facial-expression/sessions')
  },

  async getSession(sessionId: string): Promise<SessionResponseDto> {
    return apiRequest<SessionResponseDto>(`/facial-expression/sessions/${sessionId}`)
  },
}
