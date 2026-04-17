export interface PhonationFrame {
  hz: number | null;
  db: number;
  timestamp: number;
}

export interface VoiceExercise {
  id: string;
  instruction: string;
  durationMs: number;
  targetHzRange: {
    min: number;
    max: number;
  };
  type: 'sustained' | 'phrase' | 'glissando';
}

export interface ExerciseResult {
  exerciseId: string;
  frames: PhonationFrame[];
  avgHz: number;
  stability: number;
  breaks: number;
  inRange: boolean;
}

export interface SessionResult {
  exercises: ExerciseResult[];
  overallScore: number;
  avgHz: number;
  observations: string[];
  timestamp: number;
}
