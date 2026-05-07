export interface BlendshapeFrame {
  t: number;   // ms desde el inicio de la pregunta
  pk: number;  // mouthPucker
  bd: number;  // browDown promedio
  ld: number;  // lipsDown promedio
}

export interface Baseline {
  pucker: number;
  brow_down: number;
  lips_down: number;
}

export interface QuestionPayload {
  question_id: string;
  question_text: string;
  duration_ms: number;
  frames: BlendshapeFrame[];
}

export interface FacialExpressionQuestion {
  id: string;
  text: string;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  duration_ms: number;
  pucker_score: number;
  brow_down_score: number;
  lips_down_score: number;
  question_score: number;
}

export interface SessionResult {
  id: string;
  overall_score: number;
  question_results: QuestionResult[];
  created_at: string;
}

export interface SessionListItem {
  id: string;
  overall_score: number | null;
  created_at: string;
}

// Real-time blendshapes exposed by useFaceDetector during detection loop
export interface LiveBlendshapes {
  pucker: number;
  brow_down: number;
  lips_down: number;
}

export type SessionPhase =
  | 'loading'
  | 'calibration'
  | 'question'
  | 'recording'
  | 'submitting'
  | 'results'
  | 'error';
