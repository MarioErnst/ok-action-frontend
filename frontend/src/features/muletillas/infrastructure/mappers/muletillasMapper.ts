import type {
  MuletillasEvaluation,
  MuletillaDetected,
  MuletillaSeverity,
} from '../../domain/MuletillasSession'
import type {
  MuletillaDetectedEphemeralDto,
  MuletillasEvaluationDto,
  SaveMuletillasSessionDto,
} from '../dto/MuletillasDtos'

const clampPct = (value: number): number => {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toMuletillaDetected(dto: MuletillaDetectedEphemeralDto): MuletillaDetected {
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

// Approximate session duration when the frontend doesn't track it precisely:
// muletillas_per_minute lets us back-calculate from the total count, with
// a 30-second floor to avoid degenerate divisions when count is small.
const APPROX_DURATION_MS = 60_000

export function toSaveMuletillasSessionDto(
  evaluation: MuletillasEvaluation,
  parentId?: string | null,
): SaveMuletillasSessionDto {
  const endedAt = new Date()
  const startedAt = new Date(endedAt.getTime() - APPROX_DURATION_MS)

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    metrics: {
      fluency_score: clampPct(evaluation.fluencyScore),
      words: evaluation.muletillasDetected.map((m) => ({
        word: m.word,
        count: m.count,
        severity: m.severity,
      })),
    },
    parent_id: parentId ?? null,
  }
}
