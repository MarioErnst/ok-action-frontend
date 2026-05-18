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
// consistent. The corten fires when the user spends too long outside
// the optimal band — that covers both grit/clipping AND "talking too
// loud without saturating", which is a common case where the original
// clipping-only detector did nothing.
//
// Exposes:
//
//   - `currentBand`: latest classified band, drives the meter cursor.
//   - `outOfRangeStreakMs`: how long the user has been continuously in
//     `too-high` OR `clipping`. Used both as a UI hint and to fire the
//     `auto_stop_loudness` corten at the threshold.
//   - `shouldStop`: derived from outOfRangeStreakMs.
//   - `stopReason`: 'clipping' | 'too_high' | null. Indicates which band
//     the user was in when the threshold tripped so the orchestrator
//     can pick the matching copy ("saturado" vs "demasiado alto").
//   - `summary()`: aggregates band percentages + peak + noise floor for
//     the composed-eval payload.
//
// The hook only runs when both `enabled` is true and the caller has
// passed a non-null `config` (i.e. the loudness preset thresholds have
// already been resolved against the user's voice baseline).

// Continuous time the user must stay outside the optimal band before
// the corten fires. 1.5 s is short enough to react to a sustained
// shout quickly but long enough to ignore a single loud word inside
// otherwise normal speech. The previous 2 s value let users sustain
// noticeable shouting before the corten kicked in.
const OUT_OF_RANGE_THRESHOLD_MS = 1_500


export type LoudnessStopReason = 'clipping' | 'too_high'


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
  outOfRangeStreakMs: number
  shouldStop: boolean
  // Which band the user was in when the threshold tripped. Null while
  // the streak is below the threshold; set as soon as shouldStop turns
  // true so the orchestrator can read it before firing the corten.
  stopReason: LoudnessStopReason | null
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
  // Timestamp of the last frame we consumed. Using a timestamp cursor
  // instead of an array index survives the voice monitor's rolling
  // buffer cap, which would otherwise leave us frozen once the buffer
  // reaches MAX_FRAMES.
  const lastProcessedTsRef = useRef<number>(-Infinity)
  // First timestamp of the current continuous out-of-range streak
  // (any frame in too-high or clipping). Anything else resets it.
  const outOfRangeStartRef = useRef<number | null>(null)

  const [currentBand, setCurrentBand] = useState<LoudnessBand>('silence')
  const [outOfRangeStreakMs, setOutOfRangeStreakMs] = useState(0)
  const [stopReason, setStopReason] = useState<LoudnessStopReason | null>(null)

  const reset = useCallback(() => {
    bandCountsRef.current = {
      silence: 0,
      'too-low': 0,
      optimal: 0,
      'too-high': 0,
      clipping: 0,
    }
    peakDbRef.current = -Infinity
    lastProcessedTsRef.current = -Infinity
    outOfRangeStartRef.current = null
    setCurrentBand('silence')
    setOutOfRangeStreakMs(0)
    setStopReason(null)
  }, [])

  useEffect(() => {
    if (!enabled || !config) return
    let lastFrameBand: LoudnessBand | null = null
    let newestSeen = lastProcessedTsRef.current
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      if (frame.timestamp <= lastProcessedTsRef.current) continue
      newestSeen = Math.max(newestSeen, frame.timestamp)
      const band = classifyLoudness(frame.db, noiseFloor, config)
      bandCountsRef.current[band] += 1
      if (frame.db > peakDbRef.current) {
        peakDbRef.current = frame.db
      }
      if (band === 'too-high' || band === 'clipping') {
        if (outOfRangeStartRef.current === null) {
          outOfRangeStartRef.current = frame.timestamp
        }
      } else {
        // Streak resets when the user returns to optimal, too-low or
        // silence. We do NOT count too-low as "out of range" for the
        // corten: a quiet speaker is not as disruptive as a loud one
        // and the standalone loudness module will flag it at session end.
        outOfRangeStartRef.current = null
      }
      lastFrameBand = band
    }
    lastProcessedTsRef.current = newestSeen

    if (lastFrameBand !== null) {
      setCurrentBand(lastFrameBand)
    }

    if (outOfRangeStartRef.current !== null && lastFrameBand !== null) {
      const lastTimestamp = frames[frames.length - 1]?.timestamp ?? Date.now()
      const streakMs = Math.max(0, lastTimestamp - outOfRangeStartRef.current)
      setOutOfRangeStreakMs(streakMs)
      if (streakMs >= OUT_OF_RANGE_THRESHOLD_MS) {
        // The reason mirrors the band of the latest frame so a streak
        // that drifted between too-high and clipping is reported as
        // whichever the user landed on at the moment we tripped.
        setStopReason(lastFrameBand === 'clipping' ? 'clipping' : 'too_high')
      }
    } else {
      setOutOfRangeStreakMs(0)
    }
  }, [frames, enabled, config, noiseFloor])

  const summary = useCallback((): LoudnessSummaryDto | null => {
    if (!config) return null
    const counts = bandCountsRef.current
    const scoredFrames =
      counts.optimal + counts['too-low'] + counts['too-high'] + counts.clipping
    if (scoredFrames === 0) {
      // No usable frames in the session — skipping the payload is
      // better than sending zeros/NaN that the backend would either
      // reject or persist as misleading metrics.
      return null
    }
    const round = (value: number) => Math.round((value / scoredFrames) * 100)
    const peak =
      peakDbRef.current === -Infinity || Number.isNaN(peakDbRef.current)
        ? 0
        : Math.round(peakDbRef.current * 10) / 10
    const noiseFloorOut = Number.isFinite(noiseFloor)
      ? Math.round(noiseFloor * 10) / 10
      : null
    return {
      preset_id: config.presetId,
      optimal_pct: round(counts.optimal),
      low_pct: round(counts['too-low']),
      high_pct: round(counts['too-high']),
      clipping_pct: round(counts.clipping),
      peak_db: peak,
      noise_floor_db: noiseFloorOut,
    }
  }, [config, noiseFloor])

  const shouldStop = useMemo(
    () => enabled && outOfRangeStreakMs >= OUT_OF_RANGE_THRESHOLD_MS,
    [enabled, outOfRangeStreakMs],
  )

  return {
    currentBand,
    outOfRangeStreakMs,
    shouldStop,
    stopReason,
    summary,
    reset,
  }
}
