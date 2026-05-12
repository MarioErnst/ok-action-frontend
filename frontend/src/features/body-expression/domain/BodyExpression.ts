export type BodyFramingMode = 'upper_body' | 'full_body' | 'mixed'

export type BodyExpressionStatus =
  | 'idle'
  | 'calibrating'
  | 'live'
  | 'saving'
  | 'results'
  | 'error'

export interface BodyExpressionMetrics {
  postureScore: number
  opennessScore: number
  gestureScore: number
  stabilityScore: number
  energyScore: number
  framingScore: number
  trackedPct: number
  handsVisiblePct: number
  excessiveMovementPct: number
  calibrationQualityPct: number
  framingMode: BodyFramingMode
}

export interface BodyExpressionFeedback {
  summary: string
  strengths: string[]
  improvements: string[]
  recommendation: string
  source: 'gemini' | 'rules'
}

export interface BodyExpressionSessionResult {
  id: string | null
  startedAt: string
  endedAt: string
  durationMs: number
  score: number
  status: 'completed' | 'invalid' | 'error'
  metrics: BodyExpressionMetrics
  feedback: BodyExpressionFeedback
  saved: boolean
  invalidReason?: string
}

export interface BodyExpressionSessionListItem {
  id: string
  startedAt: string
  endedAt: string
  durationMs: number
  score: number
  postureScore: number
  gestureScore: number
  stabilityScore: number
  framingMode: BodyFramingMode
}

export interface BodyCalibration {
  shoulderWidth: number
  torsoHeight: number
  centerX: number
  centerY: number
  qualityPct: number
  framingMode: BodyFramingMode
}

export interface LiveBodyMetrics {
  postureScore: number
  opennessScore: number
  framingScore: number
  handsVisible: boolean
  poseVisible: boolean
  excessiveMovement: boolean
  framingMode: BodyFramingMode
}
