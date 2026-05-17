import { useEffect } from 'react'

import type { EmotionTrigger, RawEmotionName } from '../../domain/EmotionTrigger'


interface UseLiveAutoStopsOptions {
  // Whether the orchestrator is currently in a phase that accepts
  // auto-stop triggers. The watchers ignore everything when this is
  // false so stale signals captured on the way out of `recording` do
  // not fire a spurious second stop.
  enabled: boolean
  // Reactive signals from the four contributing hooks. The watchers
  // fire when the corresponding flag/trigger flips truthy.
  strikeShouldStop: boolean
  emotionTrigger: EmotionTrigger | null
  phonationShouldStop: boolean
  loudnessShouldStop: boolean
  // Callbacks invoked exactly once when the matching signal goes
  // truthy while enabled. The orchestrator decides what to do (set
  // category, fire triggerStop, etc.) — this hook only consolidates
  // the four useEffect blocks in one place.
  onStrikeStop: () => void
  onEmotionStop: (emotion: RawEmotionName) => void
  onPhonationStop: () => void
  onLoudnessStop: () => void
}


// Groups the four live auto-stop watchers in a single hook so the
// orchestrator does not have to maintain four near-identical effects.
// Each watcher gates on `enabled` so the orchestrator can suppress
// them outside the recording phase (or once a stop is already in
// flight) without each effect having to read orchestrator state.
export function useLiveAutoStops({
  enabled,
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
    if (!enabled) return
    if (!strikeShouldStop) return
    onStrikeStop()
  }, [enabled, strikeShouldStop, onStrikeStop])

  useEffect(() => {
    if (!enabled) return
    if (!emotionTrigger) return
    onEmotionStop(emotionTrigger.emotion)
  }, [enabled, emotionTrigger, onEmotionStop])

  useEffect(() => {
    if (!enabled) return
    if (!phonationShouldStop) return
    onPhonationStop()
  }, [enabled, phonationShouldStop, onPhonationStop])

  useEffect(() => {
    if (!enabled) return
    if (!loudnessShouldStop) return
    onLoudnessStop()
  }, [enabled, loudnessShouldStop, onLoudnessStop])
}
