export type LiveDim = 'pron' | 'acc' | 'mul' | 'precision' | 'pause'

export interface QARoundResult {
  relevance: number
  directness: number
  conciseness: number
  overall: number
  feedback: string
  audio_intelligible: boolean
}

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
  ctx: string
}

export interface DimResult {
  sc: number
  err?: PronError[] | AccError[]
  det?: MulDetected[]
  total_pauses?: number
  avg_pause_ms?: number
  longest_pause_ms?: number
  silence_ratio?: number
  classification?: string
  note?: string
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
  | 'qa_question'
  | 'qa_evaluating'
  | 'qa_result'
  | 'qa_unintelligible'
  | 'qa_complete'

export interface LiveSessionState {
  phase: LiveSessionPhase
  selectedDims: LiveDim[]
  analyses: AnalysisResult[]
  latestAnalysis: AnalysisResult | null
  correction: CorrectionEvent | null
  stopReason: string | null
  elapsedSeconds: number
}
