import type { AudioFrame } from '../../shared/types/audioTypes';

// PhonationFrame is an alias for the shared AudioFrame type.
// The shared type is the source of truth; this alias keeps phonation internals unchanged.
export type PhonationFrame = AudioFrame;

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
