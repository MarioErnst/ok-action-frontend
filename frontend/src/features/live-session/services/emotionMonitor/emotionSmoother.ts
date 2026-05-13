import type { RawEmotionName } from '../../domain/EmotionTrigger'

// Smooths the noisy per-frame predictions of the in-browser emotion
// classifier into a single "dominant emotion in the last second" value.
//
// Why smoothing matters: real emotion classifiers oscillate fast between
// neighbouring labels (angry <-> sad <-> angry within 100 ms while the
// expression stays the same to a human). Deciding "the user was angry
// for 5 seconds" from raw frames would either trigger on tiny twitches
// or miss real sustained expressions.
//
// The smoother applies two filters:
//   1. Confidence threshold (default 0.65) — predictions weaker than
//      this never enter the rolling window.
//   2. Dominance threshold (default 0.80) — a smoothed emotion is only
//      reported if it accounts for at least this fraction of the
//      samples currently in the window. Otherwise the smoother reports
//      null (no clear dominant).

export interface EmotionPrediction {
  emotion: RawEmotionName
  confidence: number
}

export interface EmotionSmootherOptions {
  windowMs?: number
  confidenceThreshold?: number
  dominanceThreshold?: number
}

// Default thresholds calibrated for the in-browser emotion classifier
// when fed with baseline-adjusted blendshapes. The confidence floor at
// 0.45 is intentionally permissive because the underlying classifier
// rarely crosses 0.6 even for clearly marked expressions; the dominance
// requirement at 80% of the window still keeps single-frame flickers
// from sneaking through.
const DEFAULTS: Required<EmotionSmootherOptions> = {
  windowMs: 1000,
  confidenceThreshold: 0.45,
  dominanceThreshold: 0.8,
}

interface Sample {
  ts: number
  emotion: RawEmotionName
}

export class EmotionSmoother {
  private readonly options: Required<EmotionSmootherOptions>
  private samples: Sample[] = []

  constructor(options: EmotionSmootherOptions = {}) {
    this.options = { ...DEFAULTS, ...options }
  }

  // Feed one classifier prediction. Returns the current smoothed
  // dominant emotion (or null if there is no clear dominant in the
  // current window). Predictions below the confidence threshold are
  // discarded entirely — they do not even count as "neutral".
  feed(prediction: EmotionPrediction): RawEmotionName | null {
    const now = performance.now()
    if (prediction.confidence >= this.options.confidenceThreshold) {
      this.samples.push({ ts: now, emotion: prediction.emotion })
    }
    this.trim(now)
    return this.dominant()
  }

  // Returns the current smoothed dominant emotion without feeding a new
  // sample. Useful when ticking at a regular interval to check if the
  // user has been in the same emotion long enough for a trigger.
  current(): RawEmotionName | null {
    this.trim(performance.now())
    return this.dominant()
  }

  reset(): void {
    this.samples = []
  }

  private trim(now: number): void {
    const cutoff = now - this.options.windowMs
    while (this.samples.length > 0 && this.samples[0].ts < cutoff) {
      this.samples.shift()
    }
  }

  private dominant(): RawEmotionName | null {
    if (this.samples.length === 0) return null

    const counts: Partial<Record<RawEmotionName, number>> = {}
    for (const s of this.samples) {
      counts[s.emotion] = (counts[s.emotion] ?? 0) + 1
    }

    let topEmotion: RawEmotionName | null = null
    let topCount = 0
    for (const [emotion, count] of Object.entries(counts)) {
      if ((count ?? 0) > topCount) {
        topCount = count ?? 0
        topEmotion = emotion as RawEmotionName
      }
    }

    if (topEmotion === null) return null

    const dominance = topCount / this.samples.length
    if (dominance < this.options.dominanceThreshold) return null

    return topEmotion
  }
}
