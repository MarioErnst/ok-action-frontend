import { PrecisionRepository } from '../infrastructure/PrecisionRepository'
import type { PrecisionRound } from '../domain/PrecisionRound'

export async function submitPrecisionAnswer(
  sessionId: string,
  questionId: string,
  audioBlob: Blob,
  noiseLevel: 'low' | 'medium' | 'high',
  audioDurationSecs?: number
): Promise<PrecisionRound> {
  const dto = await PrecisionRepository.submitAnswer(sessionId, questionId, audioBlob, noiseLevel, audioDurationSecs)
  const hasScores =
    dto.audio_intelligible &&
    dto.relevance_score !== null &&
    dto.directness_score !== null &&
    dto.conciseness_score !== null &&
    dto.overall_score !== null
  return {
    id: dto.round_id,
    questionText: '',  // not returned by EvaluateRoundDTO; displayed from questions[] state in the hook
    scores: hasScores ? {
      relevance: dto.relevance_score!,
      directness: dto.directness_score!,
      conciseness: dto.conciseness_score!,
      overall: dto.overall_score!,
    } : null,
    feedback: dto.feedback,
    strengths: dto.strengths,
    improvementAreas: dto.improvement_areas,
    noiseLevel,
    audioIntelligible: dto.audio_intelligible,
    createdAt: new Date().toISOString(),
  }
}
