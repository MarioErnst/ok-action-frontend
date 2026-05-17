import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { classifyLoudness } from '../../../loudness/services/loudnessClassifier'
import type {
  LoudnessBand,
  LoudnessConfig,
} from '../../../loudness/domain/LoudnessSession'
import type { AudioFrame } from '../../../../shared/types/audioTypes'
import type { LoudnessSummaryDto } from '../../infrastructure/dto/LiveAudioSummaries'


// Live loudness tracker for the session-libre layout.
//
// Reuses the standalone loudness classifier (same band thresholds as the
// dedicated module) so the live experience and the standalone one feel
// consistent. Exposes:
//
//   - `currentBand`: latest classified band, drives the meter cursor.
//   - `clippingStreakMs`: how long the user has been continuously in
//     clipping; used both as a UI hint and to fire the
//     `auto_stop_loudness` corten at the threshold.
//   - `shouldStop`: derived from `clippingStreakMs >= CLIPPING_THRESHOLD_MS`.
//   - `summary()`: aggregates band percentages + peak + noise floor for
//     the composed-eval payload.
//
// The hook only runs when both `enabled` is true and the caller has
// passed a non-null `config` (i.e. the loudness preset thresholds have
// already been resolved against the user's voice baseline).

const CLIPPING_THRESHOLD_MS = 3_000


interface UseLiveLoudnessOptions {
  // Frames coming from the shared voice monitor.
  frames: AudioFrame[]
  // Calibrated noise floor (dBFS). Drives the silence band threshold.
  noiseFloor: number
  // Resolved configuration (preset + voice baseline). Null while the
  // calibration is still in progress so the hook can safely no-op.
  config: LoudnessConfig | null
  // When false the hook does nothing.
  enabled: boolean
}


interface UseLiveLoudnessResult {
  currentBand: LoudnessBand
  clippingStreakMs: number
  shouldStop: boolean
  // Closure that computes the summary on demand at session end.
  // Returns null if no frames were classified or the config is still
  // unresolved, so the orchestrator can skip the payload.
  summary: () => LoudnessSummaryDto | null
  reset: () => void
}


export function useLiveLoudness({
  frames,
  noiseFloor,
  config,
  enabled,
}: UseLiveLoudnessOptions): UseLiveLoudnessResult {
  // Cumulative count of frames per band; used by summary().
  const bandCountsRef = useRef<Record<LoudnessBand, number>>({
    silence: 0,
    'too-low': 0,
    optimal: 0,
    'too-high': 0,
    clipping: 0,
  })
  // Highest dB observed; used for peak_db in summary().
  const peakDbRef = useRef<number>(-Infinity)
  // Frames already consumed, so we process only the new tail.
  const lastIndexRef = useRef(0)
  // First timestamp of the current continuous clipping streak.
  const clippingStreakStartRef = useRef<number | null>(null)

  const [currentBand, setCurrentBand] = useState<LoudnessBand>('silence')
  const [clippingStreakMs, setClippingStreakMs] = useState(0)

  const reset = useCallback(() => {
    bandCountsRef.current = {
      silence: 0,
      'too-low': 0,
      optimal: 0,
      'too-high': 0,
      clipping: 0,
    }
    peakDbRef.current = -Infinity
    lastIndexRef.current = 0
    clippingStreakStartRef.current = null
    setCurrentBand('silence')
    setClippingStreakMs(0)
  }, [])

  useEffect(() => {
    if (!enabled || !config) return
    if (frames.length < lastIndexRef.current) {
      // Voice monitor truncated its rolling buffer; restart the cursor.
      lastIndexRef.current = 0
    }
    let lastFrameBand: LoudnessBand | null = null
    for (let i = lastIndexRef.current; i < frames.length; i++) {
      const frame = frames[i]
      const band = classifyLoudness(frame.db, noiseFloor, config)
      bandCountsRef.current[band] += 1
      if (frame.db > peakDbRef.current) {
        peakDbRef.current = frame.db
      }
      if (band === 'clipping') {
        if (clippingStreakStartRef.current === null) {
          clippingStreakStartRef.current = frame.timestamp
        }
      } else {
        // Streak resets as soon as a non-clipping band comes through.
        clippingStreakStartRef.current = null
      }
      lastFrameBand = band
    }
    lastIndexRef.current = frames.length

    if (lastFrameBand !== null) {
      setCurrentBand(lastFrameBand)
    }

    if (clippingStreakStartRef.current !== null) {
      const lastTimestamp = frames[frames.length - 1]?.timestamp ?? Date.now()
      setClippingStreakMs(
        Math.max(0, lastTimestamp - clippingStreakStartRef.current),
      )
    } else {
      setClippingStreakMs(0)
    }
  }, [frames, enabled, config, noiseFloor])

  const summary = useCallback((): LoudnessSummaryDto | null => {
    if (!config) return null
    const counts = bandCountsRef.current
    const scoredFrames =
      counts.optimal + counts['too-low'] + counts['too-high'] + counts.clipping
    if (scoredFrames === 0) {
      return null
    }
    const round = (value: number) => Math.round((value / scoredFrames) * 100)
    return {
      preset_id: config.presetId,
      optimal_pct: round(counts.optimal),
      low_pct: round(counts['too-low']),
      high_pct: round(counts['too-high']),
      clipping_pct: round(counts.clipping),
      peak_db: peakDbRef.current === -Infinity ? 0 : Math.round(peakDbRef.current * 10) / 10,
      noise_floor_db: Math.round(noiseFloor * 10) / 10,
    }
  }, [config, noiseFloor])

  const shouldStop = useMemo(
    () => enabled && clippingStreakMs >= CLIPPING_THRESHOLD_MS,
    [enabled, clippingStreakMs],
  )

  return {
    currentBand,
    clippingStreakMs,
    shouldStop,
    summary,
    reset,
  }
}
