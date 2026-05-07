export interface BlendshapeFrame {
  t: number;   // timestamp in ms from question start
  pk: number;  // mouthPucker blendshape value
  bd: number;  // average browDown blendshape value
  ld: number;  // average lipsDown blendshape value
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
  // Scores are nullable: backend returns null when scoring couldn't run
  // (e.g., empty frames). Treat null as "no data", not as a zero score.
  pucker_score: number | null;
  brow_down_score: number | null;
  lips_down_score: number | null;
  question_score: number | null;
}

export interface SessionResult {
  id: string;
  overall_score: number | null;
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
