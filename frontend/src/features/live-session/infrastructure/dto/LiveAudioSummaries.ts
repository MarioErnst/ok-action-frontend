// Wire payloads the live composed-eval endpoint expects for the two
// client-side audio modules. Field names match the backend Pydantic
// schemas PhonationSummaryInput and LoudnessSummaryInput exactly so
// the boundary translation is a JSON.stringify away.

export interface PhonationSummaryDto {
  // Average fundamental frequency in Hz across the recording. Computed
  // by the AudioWorklet that already powers the standalone phonation
  // module.
  avg_hz: number
  // 0-100 derived from the per-frame variance vs the running mean. The
  // standalone phonation summary uses the same scale.
  stability_score: number
  // Count of sudden pitch jumps (>50 Hz delta between adjacent frames)
  // detected during the session. Used both as a quality signal and as
  // the live auto-stop trigger.
  breaks_count: number
}


export interface LoudnessSummaryDto {
  // The preset whose band thresholds were applied. Required by the
  // backend because loudness_metrics has a FK to loudness_presets.
  preset_id: string
  // Time-share percentages across the five band classifier outputs.
  // The backend re-normalizes to ensure sum=100, but we send the raw
  // computed values so the source-of-truth stays on the client.
  optimal_pct: number
  low_pct: number
  high_pct: number
  clipping_pct: number
  // Maximum dB observed in the recording. Numeric for downstream
  // analytics; the entity uses Decimal but JSON has no decimal type.
  peak_db: number
  // Ambient floor measured during the pre-session calibration step.
  // Optional because legacy clients did not produce it.
  noise_floor_db?: number
}
