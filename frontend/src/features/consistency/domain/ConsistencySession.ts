export interface ConsistencyTimelineSegment {
  segment: string
  stability: number
  rhythm: number
  volume: number
  clarity: number
  focus: number
  confidence: number
  structure: number
  note: string
}

export interface ConsistencyVolatilityEvent {
  area: string
  segment: string
  severity: string
  note: string
  suggestion: string
}

export interface ConsistencyAnalysis {
  audio_intelligible: boolean
  score: number
  rhythm_consistency_score: number
  volume_consistency_score: number
  clarity_consistency_score: number
  focus_consistency_score: number
  confidence_consistency_score: number
  structure_consistency_score: number
  classification: string
  timeline: ConsistencyTimelineSegment[]
  volatility_events: ConsistencyVolatilityEvent[]
  strengths: string[]
  improvement_areas: string[]
  recommendation: string
  fb: string
}

export type ConsistencyWarningReason =
  | 'audio_not_intelligible'
  | 'low_consistency_score'
  | 'consistency_breaks_detected'
  | 'analysis_unavailable'

export type ConsistencyPhase = 'idle' | 'connecting' | 'recording' | 'analyzing' | 'ended'
