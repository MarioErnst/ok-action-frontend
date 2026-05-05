export type LiveDim = 'pron' | 'acc' | 'mul'

export interface PronError {
  ph: string
  w: string
  fix: string
}

export interface AccError {
  w: string
  exp: string
  act: string
}

export interface MulDetected {
  w: string
  n: number
}

export interface DimResult {
  sc: number
  err?: PronError[] | AccError[]
  det?: MulDetected[]
}

export interface AnalysisResult {
  dims: Partial<Record<LiveDim, DimResult>>
  overall: number
  fb: string
}

export interface CorrectionEvent {
  dim: LiveDim | null
  reason: 'low_score' | 'error_threshold' | 'time_limit' | 'user_ended'
  errors: PronError[] | AccError[] | MulDetected[]
}

export type LiveSessionPhase =
  | 'idle'
  | 'connecting'
  | 'recording'
  | 'correction'
  | 'ended'

export interface LiveSessionState {
  phase: LiveSessionPhase
  selectedDims: LiveDim[]
  analyses: AnalysisResult[]
  latestAnalysis: AnalysisResult | null
  correction: CorrectionEvent | null
  stopReason: string | null
  elapsedSeconds: number
}
