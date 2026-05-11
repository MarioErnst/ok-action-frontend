import { PrecisionRepository } from '../infrastructure/PrecisionRepository'
import type { PrecisionRound } from '../domain/PrecisionRound'

// Renamed conceptually from "submitAnswer" to evaluateRound so callsites
// align with the backend lifecycle, but the export name keeps the old
// label so the hook keeps using it without churn.
export async function submitPrecisionAnswer(
  sessionId: string,
  roundIndex: number,
  promptId: string,
  questionText: string,
  audioBlob: Blob,
): Promise<PrecisionRound> {
  const dto = await PrecisionRepository.evaluateRound(
    sessionId,
    roundIndex,
    promptId,
    audioBlob,
  )
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
    feedback: dto.feedback || null,
    strengths: dto.strengths.length > 0 ? dto.strengths : null,
    improvementAreas: dto.improvement_areas.length > 0 ? dto.improvement_areas : null,
    audioIntelligible: dto.is_audio_intelligible,
  }
}
