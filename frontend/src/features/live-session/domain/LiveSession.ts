export type LiveDim = 'pron' | 'acc' | 'mul' | 'precision' | 'lex'

// Result of the linguistic-versatility analysis the backend runs once at
// session close when 'lex' was selected. Arrives as a single message
// `{type: "lex_result", data: LexResult}` strictly before `session_ended`.
export interface LexResult {
  versatility_score: number
  vocabulary_richness: 1 | 2 | 3
  feedback: string
  audio_intelligible: boolean
}

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
