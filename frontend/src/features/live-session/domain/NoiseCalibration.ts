// Result of the brief silence calibration that runs at the start of a
// live session. Captures the ambient noise floor of the user's
// environment so the pause detector can tell apart "real silence
// between phrases" from "speaker is just being quieter".
export interface NoiseCalibration {
  // Mean RMS amplitude during the calibration window, on the 0..1 scale
  // derived from Uint8 time-domain analyser data (where 128 is silence).
  noise_floor_rms: number
  // Standard deviation of per-bucket RMS measurements during
  // calibration. Used as a sanity check for environment drift.
  noise_floor_std: number
  // performance.now() at the moment calibration completed.
  calibrated_at_ms: number
}
