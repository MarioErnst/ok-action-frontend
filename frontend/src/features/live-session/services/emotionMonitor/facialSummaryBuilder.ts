import type { RawEmotionName } from '../../domain/EmotionTrigger'
import type { FacialSummaryPayload } from '../../domain/FacialSummary'

// Accumulates smoothed dominant-emotion samples over the duration of a
// live session and produces the FacialSummaryPayload submitted to the
// backend at finalize time. Each call to feed() counts one tick of the
// classifier loop; the final percentages are floor-then-redistribute so
// the seven values sum to exactly 100 (required by the BD CHECK
// constraint).

type SummaryKey = keyof FacialSummaryPayload

const TO_BACKEND_KEY: Record<RawEmotionName, SummaryKey> = {
  happy: 'happy_pct',
  sad: 'sad_pct',
  angry: 'angry_pct',
  surprise: 'surprised_pct',
  fear: 'fearful_pct',
  disgust: 'disgusted_pct',
  neutral: 'neutral_pct',
}

const KEYS: SummaryKey[] = [
  'happy_pct',
  'sad_pct',
  'angry_pct',
  'surprised_pct',
  'fearful_pct',
  'disgusted_pct',
  'neutral_pct',
]

export class FacialSummaryBuilder {
  private counts: Record<SummaryKey, number> = {
    happy_pct: 0,
    sad_pct: 0,
    angry_pct: 0,
    surprised_pct: 0,
    fearful_pct: 0,
    disgusted_pct: 0,
    neutral_pct: 0,
  }
  private totalSamples = 0

  // Feed one smoothed dominant emotion per classifier tick. nulls are
  // ignored (no dominant means no signal to count).
  feed(emotion: RawEmotionName | null): void {
    if (emotion === null) return
    const key = TO_BACKEND_KEY[emotion]
    this.counts[key]++
    this.totalSamples++
  }

  // Returns the payload to submit, or null if no samples were ever
  // collected (the caller should not include facial_summary in that
  // case — the backend would reject an all-zero payload).
  build(): FacialSummaryPayload | null {
    if (this.totalSamples === 0) return null

    const rawShares: Record<SummaryKey, number> = {
      happy_pct: 0,
      sad_pct: 0,
      angry_pct: 0,
      surprised_pct: 0,
      fearful_pct: 0,
      disgusted_pct: 0,
      neutral_pct: 0,
    }
    for (const key of KEYS) {
      rawShares[key] = (this.counts[key] / this.totalSamples) * 100
    }

    const floors: Record<SummaryKey, number> = { ...rawShares }
    let floorSum = 0
    for (const key of KEYS) {
      floors[key] = Math.floor(rawShares[key])
      floorSum += floors[key]
    }

    let residual = 100 - floorSum
    if (residual > 0) {
      // Distribute the residual among the largest fractional parts so
      // truncation bias does not always boost the same key.
      const fractionalOrder = KEYS.slice().sort((a, b) => {
        const fa = rawShares[a] - floors[a]
        const fb = rawShares[b] - floors[b]
        return fb - fa
      })
      for (let i = 0; i < residual && i < fractionalOrder.length; i++) {
        floors[fractionalOrder[i]] += 1
      }
      residual -= Math.min(residual, fractionalOrder.length)
    }

    return floors
  }

  reset(): void {
    for (const key of KEYS) {
      this.counts[key] = 0
    }
    this.totalSamples = 0
  }
}
