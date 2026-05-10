import type { PrecisionRound } from './PrecisionRound'

export interface PrecisionSession {
  id: string
  // 'live' replaces the old 'live_session' label so the value matches the
  // backend's precision_mode_enum exactly.
  mode: 'standalone' | 'live'
  totalRounds: number
  completedRounds: number
  overallScore: number | null
  // Status now follows the unified session_status_enum: aborted instead
  // of the precision-specific 'abandoned' value.
  status: 'active' | 'completed' | 'aborted'
  createdAt: string
  rounds: PrecisionRound[]
}
