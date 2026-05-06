// Generic audio frame produced by the voice monitor worklet.
// Kept in shared/ because multiple features (loudness, phonation) consume it.
export interface AudioFrame {
  hz: number | null;
  db: number;
  timestamp: number;
}

// Structural interface for any hook that captures microphone audio and exposes
// calibrated noise floor, live dB, and a frame history. Defined here so
// consumers (e.g. loudness) can depend on the shape without importing from phonation.
export interface VoiceMonitor {
  db: number;
  noiseFloor: number;
  isCalibrating: boolean;
  isListening: boolean;
  frames: AudioFrame[];
  start(): Promise<void>;
  stop(): Promise<void>;
}
