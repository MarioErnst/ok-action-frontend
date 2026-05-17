import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AudioFrame } from '../../../../shared/types/audioTypes'
import type { PhonationSummaryDto } from '../../infrastructure/dto/LiveAudioSummaries'


// Live phonation tracker for the session-libre layout.
//
// Consumes a rolling buffer of voice-monitor frames (Hz + dB samples from
// the AudioWorklet) and provides:
//
//   - `currentHz`: latest detected fundamental frequency or null on silence.
//   - `breaksInWindow`: number of pitch jumps inside the last 10 s window;
//     used by the orchestrator both to render a UI gauge and to fire the
//     `auto_stop_phonation` corten when it crosses the threshold.
//   - `shouldStop`: derived from `breaksInWindow >= BREAK_THRESHOLD`.
//   - `summary()`: aggregates avg_hz / stability_score / breaks_count for
//     the composed-eval payload sent at the end of the session.
//
// Breaks are detected as a delta larger than `BREAK_HZ_DELTA` between two
// consecutive voiced frames (both hz != null). Silences and transitions to
// silence do not count, which keeps natural pauses from inflating the
// counter.

const BREAK_HZ_DELTA = 50
const BREAK_WINDOW_MS = 10_000
const BREAK_THRESHOLD = 5
const STABILITY_STDDEV_CAP_HZ = 80


interface UseLivePhonationOptions {
  // Frames coming from the shared voice monitor. The hook reads them
  // in order and assumes they arrive in chronological order.
  frames: AudioFrame[]
  // When false the hook does nothing (used when the phonation module
  // was not selected — avoids running the math).
  enabled: boolean
}


interface UseLivePhonationResult {
  currentHz: number | null
  breaksInWindow: number
  shouldStop: boolean
  // Closure that computes the summary on demand at session end.
  // Returns null if the user never produced voiced audio so the
  // orchestrator can skip sending an empty payload.
  summary: () => PhonationSummaryDto | null
  reset: () => void
}


export function useLivePhonation({
  frames,
  enabled,
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

  const [currentHz, setCurrentHz] = useState<number | null>(null)
  const [breaksInWindow, setBreaksInWindow] = useState(0)

  const reset = useCallback(() => {
    hzHistoryRef.current = []
    breakTimestampsRef.current = []
    lastVoicedHzRef.current = null
    lastIndexRef.current = 0
    setCurrentHz(null)
    setBreaksInWindow(0)
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
      } else {
        // Silence resets the "previous voiced" tracker so the transition
        // out of silence does not falsely count as a break.
        lastVoicedHzRef.current = null
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
  }, [frames, enabled])

  const summary = useCallback((): PhonationSummaryDto | null => {
    const hzs = hzHistoryRef.current
    if (hzs.length === 0) return null
    const avg = hzs.reduce((sum, value) => sum + value, 0) / hzs.length
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
    () => enabled && breaksInWindow >= BREAK_THRESHOLD,
    [enabled, breaksInWindow],
  )

  return {
    currentHz,
    breaksInWindow,
    shouldStop,
    summary,
    reset,
  }
}
