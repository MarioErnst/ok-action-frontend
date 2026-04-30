export type MuletillaSeverity = 'alta' | 'media' | 'baja'

export type MuletillaDetected = {
  word: string
  count: number
  severity: MuletillaSeverity
  suggestion: string
}

export type MuletillasEvaluation = {
  overallScore: number
  fluencyScore: number
  muletillasScore: number
  totalMuletillasCount: number
  muletillasPerMinute: number
  muletillasDetected: MuletillaDetected[]
  feedback: string
  strengths: string
  improvementAreas: string
}

export type MuletillasSession = MuletillasEvaluation & {
  id: string
  questionText: string
  createdAt: string
}

export type MuletillasSessionListItem = {
  id: string
  questionText: string
  overallScore: number
  totalMuletillasCount: number
  createdAt: string
}
