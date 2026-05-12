// Severity matches the backend's muletilla_severity_enum exactly so we
// don't translate at the boundary; the UI renders user-facing Spanish
// labels from these English keys.
export type MuletillaSeverity = 'low' | 'medium' | 'high'

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
