import { useCallback, useEffect, useRef, useState } from 'react'
import type { EmotionTrigger, RawEmotionName } from '../../domain/EmotionTrigger'
import { EmotionSmoother } from '../../services/emotionMonitor/emotionSmoother'
import { SustainedDetector } from '../../services/emotionMonitor/sustainedDetector'

// Glue hook that wires the EmotionSmoother + SustainedDetector pair to
// React state. The orchestrating page is responsible for running the
// emotion classifier loop (lazy-loaded MediaPipe + small JS classifier)
// and feeding raw {emotion, confidence} predictions to feedPrediction.
//
// When the sustained-trigger condition is met for the first time, the
// hook exposes `trigger`. The orchestrator reads it, calls reset() and
// drives the auto-stop. After reset the hook is silent again until
// re-armed via start().

interface UseEmotionStopArgs {
  enabled: boolean
}

interface UseEmotionStopResult {
  trigger: EmotionTrigger | null
  start: (recordingStartedAtMs: number) => void
  feedPrediction: (emotion: RawEmotionName, confidence: number) => void
  reset: () => void
}

export function useEmotionStop({ enabled }: UseEmotionStopArgs): UseEmotionStopResult {
  const smootherRef = useRef<EmotionSmoother | null>(null)
  const detectorRef = useRef<SustainedDetector | null>(null)
  const [trigger, setTrigger] = useState<EmotionTrigger | null>(null)

  // Recreate the smoother/detector when enabled flips, so a session
  // that starts without facial expression and then activates it (not a
  // current flow but cheap to support) does not reuse stale samples.
  useEffect(() => {
    if (!enabled) {
      smootherRef.current = null
      detectorRef.current = null
      return
    }
    smootherRef.current = new EmotionSmoother()
    detectorRef.current = new SustainedDetector()
    return () => {
      smootherRef.current = null
      detectorRef.current?.reset()
      detectorRef.current = null
    }
  }, [enabled])

  const start = useCallback((recordingStartedAtMs: number) => {
    if (!enabled || !detectorRef.current) return
    detectorRef.current.start(recordingStartedAtMs, (event) => {
      setTrigger(event)
    })
  }, [enabled])

  const feedPrediction = useCallback(
    (emotion: RawEmotionName, confidence: number) => {
      const smoother = smootherRef.current
      const detector = detectorRef.current
      if (!smoother || !detector) return
      const dominant = smoother.feed({ emotion, confidence })
      detector.observe(dominant)
    },
    [],
  )

  const reset = useCallback(() => {
    smootherRef.current?.reset()
    detectorRef.current?.reset()
    setTrigger(null)
  }, [])

  return { trigger, start, feedPrediction, reset }
}
