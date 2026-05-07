import type { PrecisionRound } from '../domain/PrecisionRound'
import type { PrecisionSession } from '../domain/PrecisionSession'
import type { PrecisionRoundDTO, PrecisionSessionDTO } from './PrecisionSessionDTO'

function mapRound(dto: PrecisionRoundDTO): PrecisionRound {
  const hasScores = dto.audio_intelligible &&
    dto.relevance_score !== null &&
    dto.directness_score !== null &&
    dto.conciseness_score !== null &&
    dto.overall_score !== null

  return {
    id: dto.id,
    questionText: dto.question_text,
    scores: hasScores
      ? {
          relevance: dto.relevance_score!,
          directness: dto.directness_score!,
          conciseness: dto.conciseness_score!,
          overall: dto.overall_score!,
        }
      : null,
    feedback: dto.feedback,
    strengths: dto.strengths,
    improvementAreas: dto.improvement_areas,
    noiseLevel: dto.noise_level as 'low' | 'medium' | 'high',
    audioIntelligible: dto.audio_intelligible,
    createdAt: dto.created_at,
  }
}

export function mapSession(dto: PrecisionSessionDTO): PrecisionSession {
  return {
    id: dto.id,
    mode: dto.mode as 'standalone' | 'live_session',
    totalRounds: dto.total_rounds,
    completedRounds: dto.completed_rounds,
    overallScore: dto.overall_score,
    status: dto.status as 'active' | 'completed' | 'abandoned',
    createdAt: dto.created_at,
    rounds: dto.rounds.map(mapRound),
  }
}
