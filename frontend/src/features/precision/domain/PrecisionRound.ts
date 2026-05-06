import type { PrecisionScores } from './PrecisionScores'

export interface PrecisionRound {
  id: string
  questionText: string
  scores: PrecisionScores | null
  feedback: string | null
  strengths: string[] | null
  improvementAreas: string[] | null
  noiseLevel: 'low' | 'medium' | 'high'
  audioIntelligible: boolean
  createdAt: string
}
