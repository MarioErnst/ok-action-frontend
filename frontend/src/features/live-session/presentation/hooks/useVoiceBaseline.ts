import { useCallback, useEffect, useRef, useState } from 'react'

import type { AudioFrame } from '../../../../shared/types/audioTypes'


interface UseVoiceBaselineOptions {
  // Frames produced by the shared voice monitor. The hook walks them
  // forward and stops sampling when the caller flips capturing off.
  frames: AudioFrame[]
  // True while the calibration is in the voice-baseline step. The
  // first transition from false to true resets the accumulator so
  // each session starts fresh; transitions from true to false freeze
  // the captured baseline.
  capturing: boolean
}


interface UseVoiceBaselineResult {
  // Mean Hz of all voiced frames captured during the latest window,
  // or null while the window has not produced any voiced frame yet.
  // useLivePhonation reads this to know what "speaking normally"
  // sounds like in pitch for this particular user.
  baselineHz: number | null
  // Mean dB of voiced frames captured during the latest window. The
  // loudness classifier uses this (instead of an assumed offset) so
  // the band thresholds align with the user's actual speaking volume.
  baselineDb: number | null
  // How many voiced frames went into the current baseline. Useful in
  // logs if we end up with a noisy estimate.
  sampleCount: number
  reset: () => void
}


// Captures the user's typical pitch AND volume while they speak at a
// normal level during the voice-baseline calibration step. The step
// in CalibrationScreen already prompts the user to "speak in your
// usual voice"; this hook just listens to the shared monitor frames
// while that prompt is on screen.
//
// Implementation notes:
// - We only sample voiced frames (hz != null and hz > 0). Silence
//   frames during the prompt are ignored so a pause mid-sentence does
//   not bias the baselines downwards.
// - Both averages use the same denominator (voiced sample count) so
//   the Hz and dB estimates always describe the same audio.
// - Reset happens both on capturing rising edge (new session) and via
//   the explicit reset() callback (full orchestrator reset). Falling
//   edge freezes the result so the live detector can read it for the
//   rest of the session.
export function useVoiceBaseline({
  frames,
  capturing,
}: UseVoiceBaselineOptions): UseVoiceBaselineResult {
  const sumHzRef = useRef(0)
  const sumDbRef = useRef(0)
  const countRef = useRef(0)
  // Timestamp of the last frame we consumed. Using a timestamp cursor
  // instead of an array index survives the voice monitor's rolling
  // buffer (which caps at MAX_FRAMES — an index cursor would freeze
  // once the buffer reaches that cap, losing every later frame).
  const lastProcessedTsRef = useRef<number>(-Infinity)
  const wasCapturingRef = useRef(false)

  const [baselineHz, setBaselineHz] = useState<number | null>(null)
  const [baselineDb, setBaselineDb] = useState<number | null>(null)
  const [sampleCount, setSampleCount] = useState(0)

  const reset = useCallback(() => {
    sumHzRef.current = 0
    sumDbRef.current = 0
    countRef.current = 0
    lastProcessedTsRef.current = -Infinity
    setBaselineHz(null)
    setBaselineDb(null)
    setSampleCount(0)
  }, [])

  useEffect(() => {
    if (capturing && !wasCapturingRef.current) {
      // Rising edge: brand new baseline window. Forget any previous
      // numbers and seed the cursor at "the latest timestamp we've
      // seen so far" so we only count frames produced AFTER the
      // capture window opened.
      sumHzRef.current = 0
      sumDbRef.current = 0
      countRef.current = 0
      const latestTs = frames.reduce(
        (max, f) => (f.timestamp > max ? f.timestamp : max),
        -Infinity,
      )
      lastProcessedTsRef.current = latestTs
      setBaselineHz(null)
      setBaselineDb(null)
      setSampleCount(0)
    }
    wasCapturingRef.current = capturing
  }, [capturing, frames])

  useEffect(() => {
    if (!capturing) return
    let newestSeen = lastProcessedTsRef.current
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      if (frame.timestamp <= lastProcessedTsRef.current) continue
      newestSeen = Math.max(newestSeen, frame.timestamp)
      if (frame.hz !== null && frame.hz > 0) {
        sumHzRef.current += frame.hz
        sumDbRef.current += frame.db
        countRef.current += 1
      }
    }
    lastProcessedTsRef.current = newestSeen

    if (countRef.current > 0) {
      setBaselineHz(sumHzRef.current / countRef.current)
      setBaselineDb(sumDbRef.current / countRef.current)
      setSampleCount(countRef.current)
    }
  }, [frames, capturing])

  return { baselineHz, baselineDb, sampleCount, reset }
}
