import { useEffect } from 'react'

import type { EmotionTrigger, RawEmotionName } from '../../domain/EmotionTrigger'


interface UseLiveAutoStopsOptions {
  // Reactive signals from the four contributing hooks. The watchers
  // fire when the corresponding flag/trigger flips truthy.
  strikeShouldStop: boolean
  emotionTrigger: EmotionTrigger | null
  phonationShouldStop: boolean
  loudnessShouldStop: boolean
  // Callbacks invoked when the matching signal goes truthy. The
  // orchestrator is responsible for its own gating (phase, already
  // stopping) inside the callback — keeping that out of this hook
  // avoids tying the abstraction to live-session-specific state.
  onStrikeStop: () => void
  onEmotionStop: (emotion: RawEmotionName) => void
  onPhonationStop: () => void
  onLoudnessStop: () => void
}


// Groups the four live auto-stop watchers in a single hook so the
// orchestrator does not have to maintain four near-identical effects.
// Each effect runs the callback once per truthy transition of the
// corresponding signal; the callback decides whether to act based on
// the orchestrator's own state.
export function useLiveAutoStops({
  strikeShouldStop,
  emotionTrigger,
  phonationShouldStop,
  loudnessShouldStop,
  onStrikeStop,
  onEmotionStop,
  onPhonationStop,
  onLoudnessStop,
}: UseLiveAutoStopsOptions) {
  useEffect(() => {
    if (!strikeShouldStop) return
    onStrikeStop()
  }, [strikeShouldStop, onStrikeStop])

  useEffect(() => {
    if (!emotionTrigger) return
    onEmotionStop(emotionTrigger.emotion)
  }, [emotionTrigger, onEmotionStop])

  useEffect(() => {
    if (!phonationShouldStop) return
    onPhonationStop()
  }, [phonationShouldStop, onPhonationStop])

  useEffect(() => {
    if (!loudnessShouldStop) return
    onLoudnessStop()
  }, [loudnessShouldStop, onLoudnessStop])
}
