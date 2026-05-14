import { useCallback, useRef, useState } from 'react'
import type { FrameEvaluationResponseDto } from '../../infrastructure/dto/FrameEvaluationDtos'
import type { StrikeEvent } from '../../domain/StrikeEvent'

// Strike rules (no-dedup variant, threshold 2):
//
//   - Muletillas: every detected occurrence adds to the counter. A frame
//     reporting "eh × 3" contributes 3 strikes.
//   - Pronunciation: every phoneme_errors[] item adds to the counter. No
//     deduplication of any kind — the same mispronounced word repeated
//     across frames keeps incrementing. The intent is to stop the user
//     fast when they keep failing the same phoneme instead of giving
//     them N "free" repeats of the same mistake.
//   - Accentuation: same as pronunciation but on prosodic_errors[].
//   - The session stops as soon as ANY of the three counters reaches the
//     STRIKE_THRESHOLD. Counters are independent: 1 muletilla + 1
//     pronunciation error does not stop the session.
//
// `strikeCount` (kept for backwards compatibility with consumers showing
// "x/2") is the maximum of the three category counters.

const STRIKE_THRESHOLD = 2

interface UseFrameStrikesResult {
  strikeCount: number
  muletillaCount: number
  pronunciationErrorCount: number
  accentuationErrorCount: number
  events: StrikeEvent[]
  shouldStop: boolean
  registerFrameResponse: (frame: FrameEvaluationResponseDto) => void
  reset: () => void
}

export function useFrameStrikes(): UseFrameStrikesResult {
  const [muletillaCount, setMuletillaCount] = useState(0)
  const [pronunciationErrorCount, setPronunciationErrorCount] = useState(0)
  const [accentuationErrorCount, setAccentuationErrorCount] = useState(0)
  const [events, setEvents] = useState<StrikeEvent[]>([])

  const muletillaCountRef = useRef(0)
  const pronunciationErrorCountRef = useRef(0)
  const accentuationErrorCountRef = useRef(0)
  const eventsRef = useRef<StrikeEvent[]>([])

  const registerFrameResponse = useCallback(
    (frame: FrameEvaluationResponseDto) => {
      const newEvents: StrikeEvent[] = []
      let muletillaDelta = 0
      let pronunciationDelta = 0
      let accentuationDelta = 0
      const now = performance.now()

      if (frame.muletillas) {
        for (const item of frame.muletillas.detected) {
          for (let i = 0; i < item.count; i++) {
            newEvents.push({
              kind: 'muletilla',
              frameIndex: frame.frame_index,
              timestampMs: now,
              detail: `"${item.word}"`,
              severity: item.severity,
              word: item.word,
            })
          }
          muletillaDelta += item.count
        }
      }

      if (frame.pronunciation?.phoneme_errors) {
        for (const error of frame.pronunciation.phoneme_errors) {
          if (!error.word || error.word.trim().length === 0) continue
          pronunciationDelta += 1
          newEvents.push({
            kind: 'pronunciation',
            frameIndex: frame.frame_index,
            timestampMs: now,
            detail: error.actual_issue,
            word: error.word,
            phoneme: error.phoneme,
            actualIssue: error.actual_issue,
            suggestion: error.suggestion,
          })
        }
      }

      if (frame.accentuation?.prosodic_errors) {
        for (const error of frame.accentuation.prosodic_errors) {
          if (!error.word || error.word.trim().length === 0) continue
          accentuationDelta += 1
          newEvents.push({
            kind: 'accentuation',
            frameIndex: frame.frame_index,
            timestampMs: now,
            detail: error.actual_issue,
            word: error.word,
            expectedStress: error.expected_stress,
            actualIssue: error.actual_issue,
            suggestion: error.suggestion,
          })
        }
      }

      if (
        muletillaDelta === 0 &&
        pronunciationDelta === 0 &&
        accentuationDelta === 0
      ) {
        return
      }

      muletillaCountRef.current += muletillaDelta
      pronunciationErrorCountRef.current += pronunciationDelta
      accentuationErrorCountRef.current += accentuationDelta
      eventsRef.current = [...eventsRef.current, ...newEvents]

      setMuletillaCount(muletillaCountRef.current)
      setPronunciationErrorCount(pronunciationErrorCountRef.current)
      setAccentuationErrorCount(accentuationErrorCountRef.current)
      setEvents(eventsRef.current)
    },
    [],
  )

  const reset = useCallback(() => {
    muletillaCountRef.current = 0
    pronunciationErrorCountRef.current = 0
    accentuationErrorCountRef.current = 0
    eventsRef.current = []
    setMuletillaCount(0)
    setPronunciationErrorCount(0)
    setAccentuationErrorCount(0)
    setEvents([])
  }, [])

  const shouldStop =
    muletillaCount >= STRIKE_THRESHOLD ||
    pronunciationErrorCount >= STRIKE_THRESHOLD ||
    accentuationErrorCount >= STRIKE_THRESHOLD

  const strikeCount = Math.max(
    muletillaCount,
    pronunciationErrorCount,
    accentuationErrorCount,
  )

  return {
    strikeCount,
    muletillaCount,
    pronunciationErrorCount,
    accentuationErrorCount,
    events,
    shouldStop,
    registerFrameResponse,
    reset,
  }
}
