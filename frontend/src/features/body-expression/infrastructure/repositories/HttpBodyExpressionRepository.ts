import { apiRequest } from '../../../../api/client'
import type { BodyExpressionSessionListItem, BodyExpressionSessionResult } from '../../domain/BodyExpression'
import { toSessionListItem, toSessionResult } from '../mappers/bodyExpressionMapper'
import type {
  BodyExpressionSessionListDto,
  BodyExpressionSessionResponseDto,
  SaveBodyExpressionSessionDto,
} from '../dto/BodyExpressionDtos'

const SAVE_TIMEOUT_MS = 30_000

export const HttpBodyExpressionRepository = {
  async saveSession(data: SaveBodyExpressionSessionDto): Promise<BodyExpressionSessionResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
      const dto = await apiRequest<BodyExpressionSessionResponseDto>('/body-expression/sessions', {
        method: 'POST',
        body: data,
        signal: controller.signal,
      })
      return toSessionResult(dto)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al guardar la sesion.')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  },

  async listSessions(): Promise<BodyExpressionSessionListItem[]> {
    const dtos = await apiRequest<BodyExpressionSessionListDto>('/body-expression/sessions')
    return dtos.map(toSessionListItem)
  },

  async getSession(sessionId: string): Promise<BodyExpressionSessionResult> {
    const dto = await apiRequest<BodyExpressionSessionResponseDto>(
      `/body-expression/sessions/${sessionId}`,
    )
    return toSessionResult(dto)
  },
}
