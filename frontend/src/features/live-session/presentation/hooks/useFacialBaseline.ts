import { useCallback, useRef } from 'react'

import type {
  BlendshapeBaseline,
  BlendshapeSample,
} from '../../services/emotionMonitor/liveFaceLoop'


interface UseFacialBaselineResult {
  // Accumulate one frame of blendshape samples. Ignored once the
  // calibration phase has been marked done (`markLive`).
  feedSamples: (samples: BlendshapeSample[]) => void
  // Mark the calibration window as closed and compute the baseline
  // from the samples collected so far. Subsequent feedSamples calls
  // are no-ops. If no samples were collected the baseline stays null
  // (the caller falls back to absolute scoring).
  markLive: () => void
  // Number of frames accumulated so far. Read by the calibration
  // gate to decide when enough samples are available.
  getSampleCount: () => number
  // Computed baseline available after markLive has been called and at
  // least one sample was collected. Null otherwise.
  getBaseline: () => BlendshapeBaseline | null
  // Whether the baseline has been finalized. Used by the live face
  // loop listener to decide between accumulation and classification.
  isLive: () => boolean
  reset: () => void
}


// Owns the facial baseline lifecycle of a live session: accumulates
// raw blendshape samples while calibration is open, finalizes the
// baseline when the orchestrator signals the calibration window is
// done, and keeps the baseline available so the face loop can classify
// emotion deltas instead of absolute activations.
//
// Kept as a hook with internal refs (no state) because the face loop
// callback fires many times per second and we do not want a re-render
// per blendshape frame. Consumers read counts and baseline via getters
// so reads happen only when needed.
export function useFacialBaseline(): UseFacialBaselineResult {
  const phaseRef = useRef<'calibrating' | 'live'>('calibrating')
  const sumRef = useRef<Map<string, number>>(new Map())
  const countRef = useRef(0)
  const baselineRef = useRef<BlendshapeBaseline | null>(null)

  const feedSamples = useCallback((samples: BlendshapeSample[]) => {
    if (phaseRef.current !== 'calibrating') return
    for (const sample of samples) {
      sumRef.current.set(
        sample.categoryName,
        (sumRef.current.get(sample.categoryName) ?? 0) + sample.score,
      )
    }
    countRef.current += 1
  }, [])

  const markLive = useCallback(() => {
    if (countRef.current > 0) {
      const baseline: BlendshapeBaseline = {}
      for (const [key, sum] of sumRef.current) {
        baseline[key] = sum / countRef.current
      }
      baselineRef.current = baseline
    }
    phaseRef.current = 'live'
  }, [])

  const getSampleCount = useCallback(() => countRef.current, [])
  const getBaseline = useCallback(() => baselineRef.current, [])
  const isLive = useCallback(() => phaseRef.current === 'live', [])

  const reset = useCallback(() => {
    phaseRef.current = 'calibrating'
    sumRef.current = new Map()
    countRef.current = 0
    baselineRef.current = null
  }, [])

  return {
    feedSamples,
    markLive,
    getSampleCount,
    getBaseline,
    isLive,
    reset,
  }
}
