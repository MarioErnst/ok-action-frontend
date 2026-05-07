import { PrecisionRepository } from '../infrastructure/PrecisionRepository'

export async function finalizePrecisionSession(
  sessionId: string
): Promise<{ overallScore: number | null; completedRounds: number }> {
  const dto = await PrecisionRepository.finalizeSession(sessionId)
  return { overallScore: dto.overall_score, completedRounds: dto.completed_rounds }
}
