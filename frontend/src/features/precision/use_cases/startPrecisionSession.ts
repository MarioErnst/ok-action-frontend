import { PrecisionRepository } from '../infrastructure/PrecisionRepository'
import type { PrecisionQuestion } from '../domain/PrecisionQuestion'

export interface StartedSession {
  sessionId: string
  questions: PrecisionQuestion[]
  totalRounds: number
}

export async function startPrecisionSession(totalRounds: number = 5): Promise<StartedSession> {
  const dto = await PrecisionRepository.startSession(totalRounds)
  return {
    sessionId: dto.session_id,
    questions: dto.questions.map(q => ({
      id: q.id,
      text: q.text,
      category: q.category,
      difficultyLevel: q.difficulty_level,
    })),
    totalRounds: dto.total_rounds,
  }
}
