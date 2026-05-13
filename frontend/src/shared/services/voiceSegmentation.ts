// Shared voice activity detection (VAD) + silence classification primitive.
// Multiple modules need the same building block: take a stream of (timestamp,
// dB) frames and split it into voiced segments and silences. Each silence is
// tagged so callers can react differently to a short articulatory gap vs an
// actual voice break.
//
// Used by:
//  - Pausas: classifies pauses into natural / rhetorical / break so feedback
//    can distinguish a good pause from a hesitation.
//  - Fonación (when the new metrics land): defines "voiced blocks" within
//    phrase exercises so decay-of-dB is measured per block rather than over
//    the whole audio (a natural pause should not look like running out of
//    air).

export type SilenceKind =
  | 'articulation' // <150ms in speech; phoneme transition, not a real pause.
  | 'natural' // breath / comma / sentence delimiter; expected and useful.
  | 'rhetorical' // intentional emphasis pause (1-3s); reported separately.
  | 'break' // >3s in speech OR >100ms in sustained vocal; problematic.

export type SegmentationContext = 'speech' | 'sustained'

export interface VoiceFrame {
  /** Absolute timestamp (ms). The first frame defines t=0 of the session. */
  timestamp: number
  /** Sample energy in dBFS. Lower means quieter. */
  db: number
  /** Optional pitch; not used for VAD but forwarded for future overlays. */
  hz?: number | null
}

export interface VoicedSegment {
  /** Offset from session start, ms. */
  startMs: number
  endMs: number
  durationMs: number
  peakDb: number
  avgDb: number
  /** Energy at the first frame of the segment (used to detect end-of-segment fade). */
  startDb: number
  endDb: number
}

export interface SilenceSegment {
  startMs: number
  endMs: number
  durationMs: number
  kind: SilenceKind
}

export interface SegmentationResult {
  voicedSegments: VoicedSegment[]
  silences: SilenceSegment[]
}

export interface SegmentationOptions {
  /** Background noise level in dBFS (output of the calibration step). */
  noiseFloorDb: number
  /** dB above the noise floor that still counts as silence; default 6. */
  silenceOffsetDb?: number
  /** Total session length in ms; used to detect a silence trailing into the end. */
  totalDurationMs: number
  /**
   * Voiced gaps shorter than this are not treated as silences; they merge into
   * the surrounding voiced segment. Avoids false positives from natural
   * articulation gaps that the AudioContext samples as a single quiet frame.
   */
  mergeGapMs?: number
  /**
   * Silences shorter than this are dropped from the output entirely. Used by
   * the Pausas module to ignore microscopic gaps that are not perceptually
   * pauses. For Fonación in sustained context this should be small (~50ms) so
   * even short breaks register.
   */
  minSilenceMs?: number
  /**
   * Determines the silence classification thresholds. `speech` is the default
   * (covers Pausas, Acentuación, Pronunciación and the phrase exercises in
   * Fonación). `sustained` is for vocal sostenidas where any silence is a
   * problem.
   */
  context?: SegmentationContext
}

const DEFAULT_SILENCE_OFFSET_DB = 6
const DEFAULT_MERGE_GAP_MS = 150
const DEFAULT_MIN_SILENCE_MS = 50

// Speech-context boundaries. Articulation gaps (<150ms) are ignored
// downstream; natural pauses (breath/comma) are useful and should not be
// counted as problems; rhetorical pauses (1-3s) are positive signal in
// public-speaking coaching; only true breaks register as issues.
const SPEECH_ARTICULATION_MAX_MS = 150
const SPEECH_NATURAL_MAX_MS = 800
const SPEECH_RHETORICAL_MAX_MS = 2000

// Sustained-context boundary: vocal sostenida should be continuous, so any
// detectable silence past minSilenceMs is a break.
const SUSTAINED_BREAK_MIN_MS = 100

export function classifySilence(
  durationMs: number,
  context: SegmentationContext = 'speech',
): SilenceKind {
  if (context === 'sustained') {
    return durationMs >= SUSTAINED_BREAK_MIN_MS ? 'break' : 'articulation'
  }
  if (durationMs < SPEECH_ARTICULATION_MAX_MS) return 'articulation'
  if (durationMs < SPEECH_NATURAL_MAX_MS) return 'natural'
  if (durationMs < SPEECH_RHETORICAL_MAX_MS) return 'rhetorical'
  return 'break'
}

interface RawInterval {
  startMs: number
  endMs: number
}

function mergeAdjacent(intervals: RawInterval[], gapMs: number): RawInterval[] {
  if (intervals.length <= 1) return intervals
  const merged: RawInterval[] = [{ ...intervals[0] }]
  for (let i = 1; i < intervals.length; i++) {
    const previous = merged[merged.length - 1]
    const current = intervals[i]
    if (current.startMs - previous.endMs <= gapMs) {
      previous.endMs = Math.max(previous.endMs, current.endMs)
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

/**
 * Walk the frames and produce voiced segments + silences. Both arrays are
 * sorted by startMs and non-overlapping; together they cover the full
 * [0, totalDurationMs] interval.
 */
export function segmentVoiceFrames(
  frames: VoiceFrame[],
  options: SegmentationOptions,
): SegmentationResult {
  const totalDurationMs = Math.max(0, Math.round(options.totalDurationMs))
  if (frames.length === 0 || totalDurationMs === 0) {
    return { voicedSegments: [], silences: [] }
  }

  const mergeGapMs = options.mergeGapMs ?? DEFAULT_MERGE_GAP_MS
  const minSilenceMs = options.minSilenceMs ?? DEFAULT_MIN_SILENCE_MS
  const silenceOffsetDb = options.silenceOffsetDb ?? DEFAULT_SILENCE_OFFSET_DB
  const silenceThresholdDb = options.noiseFloorDb + silenceOffsetDb
  const context = options.context ?? 'speech'

  const ordered = [...frames].sort((a, b) => a.timestamp - b.timestamp)
  const sessionStart = ordered[0].timestamp
  const sessionEnd = sessionStart + totalDurationMs

  const rawSilences: RawInterval[] = []
  let silenceStart: number | null = null
  for (const frame of ordered) {
    if (frame.timestamp < sessionStart || frame.timestamp > sessionEnd) continue
    const isSilent = frame.db < silenceThresholdDb
    if (isSilent && silenceStart === null) {
      silenceStart = frame.timestamp
    } else if (!isSilent && silenceStart !== null) {
      rawSilences.push({
        startMs: Math.max(0, Math.round(silenceStart - sessionStart)),
        endMs: Math.max(0, Math.round(frame.timestamp - sessionStart)),
      })
      silenceStart = null
    }
  }
  if (silenceStart !== null) {
    rawSilences.push({
      startMs: Math.max(0, Math.round(silenceStart - sessionStart)),
      endMs: totalDurationMs,
    })
  }

  const mergedSilences = mergeAdjacent(rawSilences, mergeGapMs)

  const silences: SilenceSegment[] = []
  for (const interval of mergedSilences) {
    const durationMs = interval.endMs - interval.startMs
    if (durationMs < minSilenceMs) continue
    silences.push({
      startMs: interval.startMs,
      endMs: interval.endMs,
      durationMs,
      kind: classifySilence(durationMs, context),
    })
  }

  const voicedSegments = computeVoicedSegments(
    ordered,
    sessionStart,
    totalDurationMs,
    silenceThresholdDb,
    silences,
  )

  return { voicedSegments, silences }
}

function computeVoicedSegments(
  ordered: VoiceFrame[],
  sessionStart: number,
  totalDurationMs: number,
  silenceThresholdDb: number,
  silences: SilenceSegment[],
): VoicedSegment[] {
  // A voiced segment is the complement of the silences within [0, totalDuration].
  const segments: VoicedSegment[] = []
  const sortedSilences = [...silences].sort((a, b) => a.startMs - b.startMs)

  const ranges: Array<{ startMs: number; endMs: number }> = []
  let cursor = 0
  for (const silence of sortedSilences) {
    if (silence.startMs > cursor) {
      ranges.push({ startMs: cursor, endMs: silence.startMs })
    }
    cursor = Math.max(cursor, silence.endMs)
  }
  if (cursor < totalDurationMs) {
    ranges.push({ startMs: cursor, endMs: totalDurationMs })
  }

  for (const range of ranges) {
    const framesInRange = ordered.filter((f) => {
      const t = f.timestamp - sessionStart
      return t >= range.startMs && t < range.endMs && f.db >= silenceThresholdDb
    })
    if (framesInRange.length === 0) continue

    let peak = -Infinity
    let sum = 0
    for (const f of framesInRange) {
      if (f.db > peak) peak = f.db
      sum += f.db
    }
    const startDb = framesInRange[0].db
    const endDb = framesInRange[framesInRange.length - 1].db
    segments.push({
      startMs: range.startMs,
      endMs: range.endMs,
      durationMs: range.endMs - range.startMs,
      peakDb: peak,
      avgDb: sum / framesInRange.length,
      startDb,
      endDb,
    })
  }

  return segments
}
