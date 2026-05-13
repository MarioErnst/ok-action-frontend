import type { AudioFrame } from '../../../shared/types/audioTypes';

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

/**
 * Aggregated extended metrics for the session. Optional because legacy code
 * paths may not have a noise floor available to compute them.
 */
export interface SessionExtendedMetrics {
  maxSustainedVoicingMs: number;
  dbSlopeDbPerSec: number;
  weakPhraseEndingsCount: number;
}

export interface SessionResult {
  exercises: ExerciseResult[];
  overallScore: number;
  avgHz: number;
  observations: string[];
  timestamp: number;
  extended?: SessionExtendedMetrics | null;
}
