export interface PrecisionScores {
  relevance: number
  directness: number
  conciseness: number
  overall: number
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

export function scoreBgColor(score: number): string {
  if (score >= 70) return 'bg-success'
  if (score >= 40) return 'bg-warning'
  return 'bg-danger'
}
