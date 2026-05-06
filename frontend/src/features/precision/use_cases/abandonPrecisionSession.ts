import { PrecisionRepository } from '../infrastructure/PrecisionRepository'

export async function abandonPrecisionSession(sessionId: string): Promise<void> {
  await PrecisionRepository.abandonSession(sessionId)
}
