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
// Reuses the standalone loudness classifier (same band thresholds as
// the dedicated module). Fires `auto_stop_loudness` for three distinct
// sub-reasons:
//
//   - `too_high`: the user spent enough time in `too-high` without
//     saturating. "I'm speaking loud but not clipping" case.
//   - `clipping`: the user spent enough time in `clipping`. They are
//     screaming straight into the mic.
//   - `too_low`: the user spent a longer window in `too-low`. Whispery
//     speech that nobody can hear, but NOT regular silences — we
//     ignore `silence` frames entirely so respirations and inter-word
//     pauses do not penalize.
//
// The detector uses a sliding window with a ratio threshold for each
// sub-reason. A strict "all frames in band X" rule starved on natural
// speech because conversations have constant fluctuations between
// bands. The ratio model survives those: a single frame back in
// `optimal` does not reset the streak.

// Width of the sliding window used to compute the ratios. Wider than
// phonation's because loudness fluctuates more between syllables.
const LOUDNESS_WINDOW_MS = 3_000
// Minimum non-silence frames the window must hold before we trust the
// ratio. Below this we are still warming up; firing here would react
// to a single loud word.
const LOUDNESS_MIN_FRAMES_IN_WINDOW = 12
// Ratio thresholds and sustained-time thresholds for the two sides of
// the detector. "High" fires quickly because shouting is disruptive.
// "Low" needs more sustained time AND a stricter ratio because
// occasional quiet speech is not a corten-worthy event.
const HIGH_LOUDNESS_MIN_RATIO = 0.6
const HIGH_LOUDNESS_THRESHOLD_MS = 1_500
const LOW_LOUDNESS_MIN_RATIO = 0.7
const LOW_LOUDNESS_THRESHOLD_MS = 4_000


export type LoudnessStopReason = 'clipping' | 'too_high' | 'too_low'


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
  // Sustained time on the high-side of the range (too-high+clipping)
  // and the low-side (too-low). The orchestrator surfaces the high
  // streak in the live meter and uses both to decide when to fire.
  highStreakMs: number
  lowStreakMs: number
  // Ratios in the sliding window. Exposed for diagnostic logs.
  highRatio: number
  lowRatio: number
  // Non-silence frames currently in the window. Used both as the
  // "min frames" gate and for diagnostics.
  windowSize: number
  shouldStop: boolean
  // Which band tripped the corten. Null until shouldStop turns true.
  stopReason: LoudnessStopReason | null
  // Closure that computes the summary on demand at session end.
  // Returns null if no frames were classified or the config is still
  // unresolved.
  summary: () => LoudnessSummaryDto | null
  reset: () => void
}


export function useLiveLoudness({
  frames,
  noiseFloor,
  config,
  enabled,
}: UseLiveLoudnessOptions): UseLiveLoudnessResult {
  // Cumulative counts per band; used by summary().
  const bandCountsRef = useRef<Record<LoudnessBand, number>>({
    silence: 0,
    'too-low': 0,
    optimal: 0,
    'too-high': 0,
    clipping: 0,
  })
  // Highest dB observed; used for peak_db in summary().
  const peakDbRef = useRef<number>(-Infinity)
  // Timestamp cursor (not array index). The voice monitor caps its
  // rolling buffer; index cursors freeze once that cap is hit.
  const lastProcessedTsRef = useRef<number>(-Infinity)
  // Sliding window of non-silence frames. Each entry knows which side
  // it counts for (high or low). Optimal frames count toward neither
  // ratio but DO inflate the window size so a brief loud burst inside
  // mostly-optimal speech does not give a 100% high ratio.
  const windowRef = useRef<
    Array<{ ts: number; side: 'high' | 'low' | 'optimal' }>
  >([])
  // Timestamp the high/low ratio crossed its threshold for the first
  // time in the current streak. Null when the ratio is below.
  const highStartRef = useRef<number | null>(null)
  const lowStartRef = useRef<number | null>(null)

  const [currentBand, setCurrentBand] = useState<LoudnessBand>('silence')
  const [highStreakMs, setHighStreakMs] = useState(0)
  const [lowStreakMs, setLowStreakMs] = useState(0)
  const [highRatio, setHighRatio] = useState(0)
  const [lowRatio, setLowRatio] = useState(0)
  const [windowSize, setWindowSize] = useState(0)
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
    windowRef.current = []
    highStartRef.current = null
    lowStartRef.current = null
    setCurrentBand('silence')
    setHighStreakMs(0)
    setLowStreakMs(0)
    setHighRatio(0)
    setLowRatio(0)
    setWindowSize(0)
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
      // Silence is ignored from the ratio window so respirations,
      // inter-word gaps and quick pauses do not penalize either
      // detector. Optimal frames DO enter the window so brief loud or
      // quiet bursts inside otherwise normal speech do not produce a
      // misleading 100% ratio.
      if (band === 'too-high' || band === 'clipping') {
        windowRef.current.push({ ts: frame.timestamp, side: 'high' })
      } else if (band === 'too-low') {
        windowRef.current.push({ ts: frame.timestamp, side: 'low' })
      } else if (band === 'optimal') {
        windowRef.current.push({ ts: frame.timestamp, side: 'optimal' })
      }
      lastFrameBand = band
    }
    lastProcessedTsRef.current = newestSeen

    if (lastFrameBand !== null) {
      setCurrentBand(lastFrameBand)
    }

    // Trim the window to the active duration. We use the latest frame
    // timestamp as "now" so the calculation matches the data we just
    // processed and is not skewed by render delays.
    const latestTimestamp =
      frames[frames.length - 1]?.timestamp ?? Date.now()
    const windowCutoff = latestTimestamp - LOUDNESS_WINDOW_MS
    windowRef.current = windowRef.current.filter(
      (entry) => entry.ts >= windowCutoff,
    )

    const total = windowRef.current.length
    let highCount = 0
    let lowCount = 0
    for (const entry of windowRef.current) {
      if (entry.side === 'high') highCount += 1
      else if (entry.side === 'low') lowCount += 1
    }
    const newHighRatio = total > 0 ? highCount / total : 0
    const newLowRatio = total > 0 ? lowCount / total : 0
    setWindowSize(total)
    setHighRatio(newHighRatio)
    setLowRatio(newLowRatio)

    // High-side streak: streak grows while ratio exceeds threshold and
    // the window has enough non-silence samples.
    let highMs = 0
    if (
      total >= LOUDNESS_MIN_FRAMES_IN_WINDOW &&
      newHighRatio >= HIGH_LOUDNESS_MIN_RATIO
    ) {
      if (highStartRef.current === null) {
        highStartRef.current = latestTimestamp
      }
      highMs = Math.max(0, latestTimestamp - highStartRef.current)
    } else {
      highStartRef.current = null
    }
    setHighStreakMs(highMs)

    // Low-side streak: same shape, stricter ratio and longer time.
    let lowMs = 0
    if (
      total >= LOUDNESS_MIN_FRAMES_IN_WINDOW &&
      newLowRatio >= LOW_LOUDNESS_MIN_RATIO
    ) {
      if (lowStartRef.current === null) {
        lowStartRef.current = latestTimestamp
      }
      lowMs = Math.max(0, latestTimestamp - lowStartRef.current)
    } else {
      lowStartRef.current = null
    }
    setLowStreakMs(lowMs)

    // Trip state. High takes priority over low because it is more
    // disruptive and reaches the threshold faster anyway.
    if (highMs >= HIGH_LOUDNESS_THRESHOLD_MS) {
      setStopReason(lastFrameBand === 'clipping' ? 'clipping' : 'too_high')
    } else if (lowMs >= LOW_LOUDNESS_THRESHOLD_MS) {
      setStopReason('too_low')
    }
  }, [frames, enabled, config, noiseFloor])

  const summary = useCallback((): LoudnessSummaryDto | null => {
    if (!config) {
      console.warn('[useLiveLoudness] summary skipped: config is null')
      return null
    }
    const counts = bandCountsRef.current
    const scoredFrames =
      counts.optimal + counts['too-low'] + counts['too-high'] + counts.clipping
    if (scoredFrames === 0) {
      // No usable frames in the session — skipping the payload is
      // better than sending zeros/NaN that the backend would either
      // reject or persist as misleading metrics.
      console.warn('[useLiveLoudness] summary skipped: scoredFrames=0', counts)
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
    () =>
      enabled &&
      (highStreakMs >= HIGH_LOUDNESS_THRESHOLD_MS ||
        lowStreakMs >= LOW_LOUDNESS_THRESHOLD_MS),
    [enabled, highStreakMs, lowStreakMs],
  )

  return {
    currentBand,
    highStreakMs,
    lowStreakMs,
    highRatio,
    lowRatio,
    windowSize,
    shouldStop,
    stopReason,
    summary,
    reset,
  }
}
