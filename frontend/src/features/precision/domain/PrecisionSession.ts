import type { PrecisionRound } from './PrecisionRound'

export interface PrecisionSession {
  id: string
  mode: 'standalone' | 'live_session'
  totalRounds: number
  completedRounds: number
  overallScore: number | null
  status: 'active' | 'completed' | 'abandoned'
  createdAt: string
  rounds: PrecisionRound[]
}
