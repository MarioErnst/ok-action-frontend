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
// normal pitch.
const HIGH_PITCH_FACTOR = 1.25
// Sliding window over which we compute the "above ceiling" ratio.
// 2 s is wide enough to absorb the natural fluctuations of speech
// (vocals come and go, sometimes a single syllable dips below the
// ceiling) without losing reactivity for a sustained shout.
const HIGH_PITCH_WINDOW_MS = 2_000
// Minimum number of voiced frames the window must contain before we
// trust the ratio. Below this we are still gathering data and refuse
// to fire the trigger to avoid false positives on a single loud
// vowel.
const HIGH_PITCH_MIN_VOICED_IN_WINDOW = 8
// Fraction of voiced frames in the window that must be above the
// ceiling. 0.6 means "at least 60% of what you're voicing is above
// your normal pitch". Empirically this is the right shape for natural
// shouting: speech fluctuates a lot, demanding 100% above the ceiling
// (the old logic) starved the detector forever.
const HIGH_PITCH_MIN_RATIO = 0.6
// Time the ratio must stay above HIGH_PITCH_MIN_RATIO continuously
// before the corten fires. Short enough to react to a sustained shout
// quickly, long enough to ignore a brief high-pitched outburst.
const HIGH_PITCH_THRESHOLD_MS = 1_500


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
  // Time (ms) the ratio of voiced frames above the ceiling has stayed
  // above HIGH_PITCH_MIN_RATIO continuously. Resets to 0 when the
  // ratio drops below the threshold. The orchestrator uses this for
  // the live UI feedback and the auto-stop trigger.
  highPitchStreakMs: number
  // Latest observed ratio of voiced frames above the ceiling, 0..1.
  // Exposed for diagnostic logs so we can see how aggressive the user
  // is being relative to their baseline.
  highPitchRatio: number
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
  // Sliding window of voiced frames used for the ratio calculation.
  // Each entry stores the frame timestamp and whether the pitch was
  // above the ceiling. Trimmed to HIGH_PITCH_WINDOW_MS on every pass.
  const voicedWindowRef = useRef<Array<{ ts: number; aboveCeiling: boolean }>>(
    [],
  )
  // Timestamp the ratio crossed HIGH_PITCH_MIN_RATIO for the first time
  // in the current streak. Null while the ratio is below the threshold.
  const highPitchStartRef = useRef<number | null>(null)

  const [currentHz, setCurrentHz] = useState<number | null>(null)
  const [breaksInWindow, setBreaksInWindow] = useState(0)
  const [highPitchStreakMs, setHighPitchStreakMs] = useState(0)
  const [highPitchRatio, setHighPitchRatio] = useState(0)
  const [stopReason, setStopReason] = useState<PhonationStopReason | null>(null)

  const reset = useCallback(() => {
    hzHistoryRef.current = []
    breakTimestampsRef.current = []
    lastVoicedHzRef.current = null
    lastIndexRef.current = 0
    voicedWindowRef.current = []
    highPitchStartRef.current = null
    setCurrentHz(null)
    setBreaksInWindow(0)
    setHighPitchStreakMs(0)
    setHighPitchRatio(0)
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
        // Only voiced frames feed the high-pitch ratio window. Silence
        // and null-hz frames are ignored entirely (the worklet is too
        // strict at returning null on consonants — counting those as
        // "below ceiling" was the bug).
        if (highPitchCeiling !== null) {
          voicedWindowRef.current.push({
            ts: frame.timestamp,
            aboveCeiling: hz >= highPitchCeiling,
          })
        }
      } else {
        lastVoicedHzRef.current = null
      }
    }
    lastIndexRef.current = frames.length

    // Trim break timestamps to the active break window.
    const cutoff = Date.now() - BREAK_WINDOW_MS
    breakTimestampsRef.current = breakTimestampsRef.current.filter(
      (ts) => ts >= cutoff,
    )

    // Trim voiced window. Use the latest frame timestamp as "now" so
    // the calculation is consistent with the data we just processed
    // and not skewed by render delays.
    const latestTimestamp =
      frames[frames.length - 1]?.timestamp ?? Date.now()
    const windowCutoff = latestTimestamp - HIGH_PITCH_WINDOW_MS
    voicedWindowRef.current = voicedWindowRef.current.filter(
      (entry) => entry.ts >= windowCutoff,
    )

    const latestVoiced = hzHistoryRef.current[hzHistoryRef.current.length - 1] ?? null
    setCurrentHz(latestVoiced)
    setBreaksInWindow(breakTimestampsRef.current.length)

    // Compute the high-pitch ratio over the sliding window. We require
    // a minimum number of voiced samples so a single shouted vowel does
    // not produce a 100% ratio that immediately trips.
    const voicedCount = voicedWindowRef.current.length
    const aboveCount = voicedWindowRef.current.reduce(
      (sum, entry) => sum + (entry.aboveCeiling ? 1 : 0),
      0,
    )
    const ratio = voicedCount > 0 ? aboveCount / voicedCount : 0
    setHighPitchRatio(ratio)

    let highPitchMs = 0
    if (highPitchCeiling !== null) {
      if (
        voicedCount >= HIGH_PITCH_MIN_VOICED_IN_WINDOW &&
        ratio >= HIGH_PITCH_MIN_RATIO
      ) {
        if (highPitchStartRef.current === null) {
          highPitchStartRef.current = latestTimestamp
        }
        highPitchMs = Math.max(
          0,
          latestTimestamp - highPitchStartRef.current,
        )
      } else {
        highPitchStartRef.current = null
      }
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
    highPitchRatio,
    shouldStop,
    stopReason,
    summary,
    reset,
  }
}
