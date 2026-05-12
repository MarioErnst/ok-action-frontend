import { PrecisionRepository } from '../infrastructure/PrecisionRepository'
import type { PrecisionQuestion } from '../domain/PrecisionQuestion'

export interface StartedSession {
  sessionId: string
  questions: PrecisionQuestion[]
  totalRounds: number
}

export async function startPrecisionSession(
  totalRounds: number = 5,
  parentId?: string | null,
): Promise<StartedSession> {
  const dto = await PrecisionRepository.startSession(totalRounds, parentId)
  return {
    sessionId: dto.session_id,
    questions: dto.prompts.map((p) => ({
      id: p.id,
      text: p.text,
      category: p.category,
      difficulty: p.difficulty,
    })),
    totalRounds: dto.rounds_total,
  }
}
