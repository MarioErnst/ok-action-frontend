import { apiRequest } from '../../../../api/client'
import type {
  SaveSessionDto,
  SessionListDto,
  SessionResponseDto,
} from '../dto/FacialExpressionDtos'
import type { SessionListItem, SessionResult } from '../../domain/FacialExpression'
import { toSessionListItem, toSessionResult } from '../mappers/facialExpressionMapper'

// Sessions are usually small (tens of events) but the backend may be cold-starting.
// 30s caps the wait so the "Guardando..." spinner never loops forever.
const SAVE_TIMEOUT_MS = 30_000

// apiRequest from the shared client handles auth_token from localStorage and
// the three-level API base URL resolution automatically. The repository
// returns the SessionResult/SessionListItem domain shape so callers stay
// free of DTO details; the mappers do the translation.
export const HttpFacialExpressionRepository = {
  async saveSession(data: SaveSessionDto): Promise<SessionResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
      const dto = await apiRequest<SessionResponseDto>('/facial-expression/sessions', {
        method: 'POST',
        body: data,
        signal: controller.signal,
      })
      return toSessionResult(dto)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al guardar la sesión.')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  },

  async listSessions(): Promise<SessionListItem[]> {
    const dtos = await apiRequest<SessionListDto>('/facial-expression/sessions')
    return dtos.map((d) => toSessionListItem(d))
  },

  async getSession(sessionId: string): Promise<SessionResult> {
    const dto = await apiRequest<SessionResponseDto>(`/facial-expression/sessions/${sessionId}`)
    return toSessionResult(dto)
  },
}
