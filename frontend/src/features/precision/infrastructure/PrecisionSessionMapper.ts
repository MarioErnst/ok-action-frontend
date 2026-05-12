import type { PrecisionRound } from '../domain/PrecisionRound'
import type { PrecisionSession } from '../domain/PrecisionSession'
import type { PrecisionRoundDTO, PrecisionSessionDTO } from './PrecisionSessionDTO'

function mapRound(dto: PrecisionRoundDTO, questionText: string): PrecisionRound {
  const hasScores =
    dto.is_audio_intelligible &&
    dto.relevance_score !== null &&
    dto.directness_score !== null &&
    dto.conciseness_score !== null &&
    dto.score !== null

  return {
    roundIndex: dto.round_index,
    promptId: dto.prompt_id,
    questionText,
    scores: hasScores
      ? {
          relevance: dto.relevance_score!,
          directness: dto.directness_score!,
          conciseness: dto.conciseness_score!,
          overall: dto.score!,
        }
      : null,
    feedback: null,
    strengths: null,
    improvementAreas: null,
    audioIntelligible: dto.is_audio_intelligible,
  }
}

export function mapSession(dto: PrecisionSessionDTO): PrecisionSession {
  return {
    id: dto.id,
    mode: dto.metrics.mode,
    totalRounds: dto.metrics.rounds_total,
    completedRounds: dto.metrics.rounds_completed,
    overallScore: dto.score,
    status: dto.status,
    createdAt: dto.created_at,
    // Detail does not include prompt text on each round; the UI keeps
    // its own questions[] array indexed by round_index for display.
    rounds: dto.rounds.map((r) => mapRound(r, '')),
  }
}
