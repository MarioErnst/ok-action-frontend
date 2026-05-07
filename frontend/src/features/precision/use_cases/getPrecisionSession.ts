import { PrecisionRepository } from '../infrastructure/PrecisionRepository'
import { mapSession } from '../infrastructure/PrecisionSessionMapper'
import type { PrecisionSession } from '../domain/PrecisionSession'

export async function getPrecisionSession(sessionId: string): Promise<PrecisionSession> {
  const dto = await PrecisionRepository.getSession(sessionId)
  return mapSession(dto)
}
