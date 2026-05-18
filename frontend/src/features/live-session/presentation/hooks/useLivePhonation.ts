import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AudioFrame } from '../../../../shared/types/audioTypes'
import type { PhonationSummaryDto } from '../../infrastructure/dto/LiveAudioSummaries'


// Live phonation tracker for the session-libre layout.
//
// Consumes a rolling buffer of voice-monitor frames (Hz + dB samples from
// the AudioWorklet) and fires the `auto_stop_phonation` corten for two
// independent reasons:
//
//   - High pitch sustained: the user has been speaking at a frequency
//     above `baselineHz * HIGH_PITCH_FACTOR` for `HIGH_PITCH_THRESHOLD_MS`
//     in a row. This catches "speaking in a strained / shouty voice"
//     which the original break-based detector missed.
//   - Pitch breaks: the user produced too many large frequency jumps in
//     a short window. Useful for catching erratic delivery.
//
// `baselineHz` comes from useVoiceBaseline, which captured the user's
// typical Hz during the voice-baseline step of calibration. When the
// baseline is null (calibration without loudness/no voice frames) the
// high-pitch detector stays disabled and we fall back to break-only.
//
// Exposes:
//   - `currentHz`: latest detected fundamental frequency or null on silence.
//   - `breaksInWindow`: count of pitch jumps inside the rolling window.
//   - `highPitchStreakMs`: ms continuously above the high-pitch threshold.
//   - `shouldStop`: true when either reason has tripped.
//   - `stopReason`: which detector tripped ('high_pitch' | 'breaks' | null).
//   - `summary()`: aggregates avg_hz / stability_score / breaks_count.
//
// Breaks are detected as a delta larger than `BREAK_HZ_DELTA` between two
// consecutive voiced frames (both hz != null). Silences and transitions to
// silence do not count, which keeps natural pauses from inflating the
// counter.

const BREAK_HZ_DELTA = 50
const BREAK_WINDOW_MS = 10_000
const BREAK_THRESHOLD = 5
const STABILITY_STDDEV_CAP_HZ = 80
// Multiplier over the calibrated baseline above which we consider the
// user is straining the voice. 1.25 means roughly +25% over their
// normal pitch — empirically that is where a typical speaker starts
// to sound shouty without yet being a full scream. Earlier sessions
// at 1.4 (+40%) were too lax: users reported they could "almost yell"
// without triggering the corten.
const HIGH_PITCH_FACTOR = 1.25
// Continuous time the user must stay above the threshold before the
// corten fires. 1.5 s is short enough to react to a sustained shout
// quickly but long enough to ignore a single high-pitched word inside
// otherwise normal speech.
const HIGH_PITCH_THRESHOLD_MS = 1_500
// Tolerance for short gaps in the high-pitch streak. The AudioWorklet
// frequently returns hz=null between voiced frames (consonants, micro
// pauses, frames where pitch detection lacks confidence) so a strict
// "any non-above-ceiling frame resets the streak" rule never lets the
// counter reach the threshold even while the user is clearly shouting.
// We keep the streak alive as long as we have seen a frame above the
// ceiling within the last GAP_TOLERANCE_MS.
const HIGH_PITCH_GAP_TOLERANCE_MS = 500


export type PhonationStopReason = 'high_pitch' | 'breaks'


interface UseLivePhonationOptions {
  // Frames coming from the shared voice monitor. The hook reads them
  // in order and assumes they arrive in chronological order.
  frames: AudioFrame[]
  // When false the hook does nothing (used when the phonation module
  // was not selected — avoids running the math).
  enabled: boolean
  // User's typical Hz captured during calibration. Null when no
  // baseline was captured: the high-pitch detector stays off and we
  // fall back to break-only behavior.
  baselineHz: number | null
}


interface UseLivePhonationResult {
  currentHz: number | null
  breaksInWindow: number
  highPitchStreakMs: number
  shouldStop: boolean
  // Which detector tripped. Null while neither has tripped; the
  // orchestrator reads it to pick the matching corten copy.
  stopReason: PhonationStopReason | null
  // Closure that computes the summary on demand at session end.
  // Returns null if the user never produced voiced audio so the
  // orchestrator can skip sending an empty payload.
  summary: () => PhonationSummaryDto | null
  reset: () => void
}


export function useLivePhonation({
  frames,
  enabled,
  baselineHz,
}: UseLivePhonationOptions): UseLivePhonationResult {
  // Every voiced Hz value we have seen. Cumulative; used by summary().
  const hzHistoryRef = useRef<number[]>([])
  // Timestamps (ms) of detected breaks. Trimmed to the active window.
  const breakTimestampsRef = useRef<number[]>([])
  // Hz of the most recent voiced frame, so we can compare against the
  // next one and decide whether a break happened.
  const lastVoicedHzRef = useRef<number | null>(null)
  // Index of the last frame consumed from the input buffer. Lets us
  // process only new frames on each render instead of re-walking the
  // whole rolling buffer.
  const lastIndexRef = useRef(0)
  // Timestamp of the first frame in the active "high-pitch" streak,
  // or null when the user is below the high-pitch threshold.
  const highPitchStartRef = useRef<number | null>(null)
  // Timestamp of the most recent frame that crossed the ceiling. Used
  // together with HIGH_PITCH_GAP_TOLERANCE_MS to tolerate short gaps
  // (silences and null-hz frames between consonants) without breaking
  // the streak.
  const lastHighPitchHitRef = useRef<number | null>(null)

  const [currentHz, setCurrentHz] = useState<number | null>(null)
  const [breaksInWindow, setBreaksInWindow] = useState(0)
  const [highPitchStreakMs, setHighPitchStreakMs] = useState(0)
  const [stopReason, setStopReason] = useState<PhonationStopReason | null>(null)

  const reset = useCallback(() => {
    hzHistoryRef.current = []
    breakTimestampsRef.current = []
    lastVoicedHzRef.current = null
    lastIndexRef.current = 0
    highPitchStartRef.current = null
    lastHighPitchHitRef.current = null
    setCurrentHz(null)
    setBreaksInWindow(0)
    setHighPitchStreakMs(0)
    setStopReason(null)
  }, [])

  useEffect(() => {
    if (!enabled) return
    // The shared voice monitor caps its rolling buffer at MAX_FRAMES,
    // so a long session will see the array shrink from the left. Our
    // index tracking respects that: if the array got shorter we reset
    // the cursor to keep going from the first new frame.
    if (frames.length < lastIndexRef.current) {
      lastIndexRef.current = 0
    }
    const highPitchCeiling =
      baselineHz !== null ? baselineHz * HIGH_PITCH_FACTOR : null
    for (let i = lastIndexRef.current; i < frames.length; i++) {
      const frame = frames[i]
      const hz = frame.hz
      if (hz !== null && hz > 0) {
        hzHistoryRef.current.push(hz)
        const previous = lastVoicedHzRef.current
        if (previous !== null && Math.abs(hz - previous) >= BREAK_HZ_DELTA) {
          breakTimestampsRef.current.push(frame.timestamp)
        }
        lastVoicedHzRef.current = hz
        if (highPitchCeiling !== null) {
          if (hz >= highPitchCeiling) {
            // Above ceiling: open the streak if it was closed, and
            // always refresh the "last hit" timestamp so subsequent
            // gaps know we were just up there.
            if (highPitchStartRef.current === null) {
              highPitchStartRef.current = frame.timestamp
            }
            lastHighPitchHitRef.current = frame.timestamp
          } else {
            // Below ceiling with a voiced frame is a clear signal the
            // user came back to normal pitch — reset immediately.
            highPitchStartRef.current = null
            lastHighPitchHitRef.current = null
          }
        }
      } else {
        // Silence frame. We deliberately do NOT reset the high-pitch
        // streak here: the AudioWorklet emits null between voiced
        // frames more often than not (consonants, micro-pauses, low
        // confidence) and a strict reset starved the detector. The
        // tolerance check below closes the streak if the last hit is
        // older than HIGH_PITCH_GAP_TOLERANCE_MS.
        lastVoicedHzRef.current = null
        if (
          highPitchStartRef.current !== null &&
          lastHighPitchHitRef.current !== null &&
          frame.timestamp - lastHighPitchHitRef.current >
            HIGH_PITCH_GAP_TOLERANCE_MS
        ) {
          highPitchStartRef.current = null
          lastHighPitchHitRef.current = null
        }
      }
    }
    lastIndexRef.current = frames.length

    // Trim break timestamps to the active window.
    const cutoff = Date.now() - BREAK_WINDOW_MS
    breakTimestampsRef.current = breakTimestampsRef.current.filter(
      (ts) => ts >= cutoff,
    )

    const latestVoiced = hzHistoryRef.current[hzHistoryRef.current.length - 1] ?? null
    setCurrentHz(latestVoiced)
    setBreaksInWindow(breakTimestampsRef.current.length)

    let highPitchMs = 0
    if (highPitchStartRef.current !== null) {
      const lastTimestamp = frames[frames.length - 1]?.timestamp ?? Date.now()
      highPitchMs = Math.max(0, lastTimestamp - highPitchStartRef.current)
    }
    setHighPitchStreakMs(highPitchMs)

    // Compute trip state inline so the orchestrator can read the
    // reason atomically with shouldStop.
    if (highPitchMs >= HIGH_PITCH_THRESHOLD_MS) {
      setStopReason('high_pitch')
    } else if (breakTimestampsRef.current.length >= BREAK_THRESHOLD) {
      setStopReason('breaks')
    }
  }, [frames, enabled, baselineHz])

  const summary = useCallback((): PhonationSummaryDto | null => {
    const hzs = hzHistoryRef.current
    if (hzs.length === 0) return null
    const avg = hzs.reduce((sum, value) => sum + value, 0) / hzs.length
    if (!Number.isFinite(avg) || avg <= 0) {
      // Defensive: a zero/NaN average means the AudioWorklet never
      // produced voiced frames despite the buffer growing. Skipping
      // the payload is safer than sending invalid numbers that the
      // backend would reject.
      return null
    }
    const variance =
      hzs.reduce((sum, value) => sum + (value - avg) ** 2, 0) / hzs.length
    const stddev = Math.sqrt(variance)
    // Stability score is 100 when stddev is 0 and decays linearly with
    // stddev, hitting 0 at STABILITY_STDDEV_CAP_HZ. The cap matches the
    // expected spread of natural conversational speech; the standalone
    // module uses per-exercise specific formulas, this is the simple
    // live equivalent.
    const stability = Math.max(
      0,
      Math.min(100, Math.round(100 - (stddev / STABILITY_STDDEV_CAP_HZ) * 100)),
    )
    return {
      avg_hz: Math.round(avg * 10) / 10,
      stability_score: stability,
      breaks_count: breakTimestampsRef.current.length,
    }
  }, [])

  const shouldStop = useMemo(
    () =>
      enabled &&
      (highPitchStreakMs >= HIGH_PITCH_THRESHOLD_MS ||
        breaksInWindow >= BREAK_THRESHOLD),
    [enabled, breaksInWindow, highPitchStreakMs],
  )

  return {
    currentHz,
    breaksInWindow,
    highPitchStreakMs,
    shouldStop,
    stopReason,
    summary,
    reset,
  }
}
