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
  const lastIndexRef = useRef(0)
  const wasCapturingRef = useRef(false)

  const [baselineHz, setBaselineHz] = useState<number | null>(null)
  const [baselineDb, setBaselineDb] = useState<number | null>(null)
  const [sampleCount, setSampleCount] = useState(0)

  const reset = useCallback(() => {
    sumHzRef.current = 0
    sumDbRef.current = 0
    countRef.current = 0
    lastIndexRef.current = 0
    setBaselineHz(null)
    setBaselineDb(null)
    setSampleCount(0)
  }, [])

  useEffect(() => {
    if (capturing && !wasCapturingRef.current) {
      // Rising edge: brand new baseline window. Forget any previous
      // numbers so a retry of the session starts fresh.
      sumHzRef.current = 0
      sumDbRef.current = 0
      countRef.current = 0
      lastIndexRef.current = frames.length
      setBaselineHz(null)
      setBaselineDb(null)
      setSampleCount(0)
    }
    wasCapturingRef.current = capturing
  }, [capturing, frames.length])

  useEffect(() => {
    if (!capturing) return
    if (frames.length < lastIndexRef.current) {
      lastIndexRef.current = 0
    }
    for (let i = lastIndexRef.current; i < frames.length; i++) {
      const frame = frames[i]
      if (frame.hz !== null && frame.hz > 0) {
        sumHzRef.current += frame.hz
        sumDbRef.current += frame.db
        countRef.current += 1
      }
    }
    lastIndexRef.current = frames.length

    if (countRef.current > 0) {
      setBaselineHz(sumHzRef.current / countRef.current)
      setBaselineDb(sumDbRef.current / countRef.current)
      setSampleCount(countRef.current)
    }
  }, [frames, capturing])

  return { baselineHz, baselineDb, sampleCount, reset }
}
