import type { EmotionTrigger, RawEmotionName } from '../../domain/EmotionTrigger'
import { TRIGGER_EMOTIONS } from '../../domain/EmotionTrigger'

// Watches the smoothed emotion stream and emits a trigger when one of
// the configured negative emotions has been the dominant smoothed
// emotion continuously for sustainedMs (default 5000 ms). Sustained
// here means "without interruption" — if the dominant flips even for
// one tick the accumulator resets.

export interface SustainedDetectorOptions {
  sustainedMs?: number
  // Override which raw emotions trigger. By default, the agreed scope:
  // sad, angry, fear, disgust. happy and surprise never trigger
  // because they are positive/neutral for a speaker.
  triggerEmotions?: ReadonlyArray<RawEmotionName>
}

const DEFAULTS: { sustainedMs: number; triggerEmotions: ReadonlyArray<RawEmotionName> } = {
  sustainedMs: 5000,
  triggerEmotions: TRIGGER_EMOTIONS,
}

export class SustainedDetector {
  private readonly sustainedMs: number
  private readonly triggerSet: Set<RawEmotionName>
  // Currently accumulating emotion (or null when no trigger emotion is
  // dominant). When the smoothed dominant changes, we reset.
  private currentEmotion: RawEmotionName | null = null
  private currentStartedAt = 0
  private recordingStartedAt = 0
  private fired = false
  private listener: ((trigger: EmotionTrigger) => void) | null = null

  constructor(options: SustainedDetectorOptions = {}) {
    this.sustainedMs = options.sustainedMs ?? DEFAULTS.sustainedMs
    this.triggerSet = new Set(options.triggerEmotions ?? DEFAULTS.triggerEmotions)
  }

  start(
    recordingStartedAtMs: number,
    listener: (trigger: EmotionTrigger) => void,
  ): void {
    this.recordingStartedAt = recordingStartedAtMs
    this.listener = listener
    this.currentEmotion = null
    this.currentStartedAt = 0
    this.fired = false
  }

  // Feed the latest smoothed dominant emotion. Call this on every
  // emotion classifier tick (after running the smoother). When the
  // sustained condition is satisfied for the first time, the listener
  // fires exactly once. Subsequent calls after firing do nothing until
  // reset() is invoked.
  observe(dominant: RawEmotionName | null): void {
    if (this.fired || !this.listener) return

    const now = performance.now()

    if (dominant === null || !this.triggerSet.has(dominant)) {
      this.currentEmotion = null
      this.currentStartedAt = 0
      return
    }

    if (this.currentEmotion !== dominant) {
      this.currentEmotion = dominant
      this.currentStartedAt = now
      return
    }

    if (now - this.currentStartedAt >= this.sustainedMs) {
      this.fired = true
      this.listener({
        emotion: dominant,
        triggeredAtMs: now - this.recordingStartedAt,
      })
    }
  }

  reset(): void {
    this.currentEmotion = null
    this.currentStartedAt = 0
    this.fired = false
    this.listener = null
  }
}
