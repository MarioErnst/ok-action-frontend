import type { PrecisionScores } from './PrecisionScores'

export interface PrecisionRound {
  // Composite identity from the backend's PK (session_id, round_index).
  // Per-round UUID went away; the index suffices to address a round.
  roundIndex: number
  promptId: string
  questionText: string
  scores: PrecisionScores | null
  // Ephemeral fields populated by the /rounds Gemini response and shown
  // on the round-result screen; not persisted in the session detail.
  feedback: string | null
  strengths: string[] | null
  improvementAreas: string[] | null
  audioIntelligible: boolean
}
