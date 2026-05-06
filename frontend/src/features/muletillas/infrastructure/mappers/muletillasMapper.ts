import type { MuletillasEvaluation, MuletillaDetected, MuletillaSeverity } from '../../domain/MuletillasSession'
import type { MuletillasEvaluationDto, MuletillaDetectedDto } from '../dto/MuletillasDtos'

function toMuletillaDetected(dto: MuletillaDetectedDto): MuletillaDetected {
  return {
    word: dto.word,
    count: dto.count,
    severity: dto.severity as MuletillaSeverity,
    suggestion: dto.suggestion,
  }
}

export function toMuletillasEvaluation(dto: MuletillasEvaluationDto): MuletillasEvaluation {
  return {
    overallScore: dto.overall_score,
    fluencyScore: dto.fluency_score,
    muletillasScore: dto.muletillas_score,
    totalMuletillasCount: dto.total_muletillas_count,
    muletillasPerMinute: dto.muletillas_per_minute,
    muletillasDetected: dto.muletillas_detected.map(toMuletillaDetected),
    feedback: dto.feedback,
    strengths: dto.strengths,
    improvementAreas: dto.improvement_areas,
  }
}
