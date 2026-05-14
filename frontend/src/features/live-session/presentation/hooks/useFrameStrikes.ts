import { useCallback, useRef, useState } from 'react'
import type { FrameEvaluationResponseDto } from '../../infrastructure/dto/FrameEvaluationDtos'
import type { StrikeEvent } from '../../domain/StrikeEvent'

// Strike rules since the live-evaluation-grounding hotfix:
//
//   - Muletillas: each detected occurrence (count from
//     `muletillas.detected[].count`) adds to the muletilla counter. No
//     deduplication across frames — the goal is to discourage filler use
//     in real time.
//   - Pronunciation: each unique mispronounced word reported across the
//     whole session (Set deduplicated by normalised form) adds one strike
//     to the pronunciation counter.
//   - Accentuation: same as pronunciation but on prosodic_errors[].word.
//   - The session stops as soon as ANY of the three counters reaches the
//     STRIKE_THRESHOLD. Counters are independent: 2 muletillas + 2
//     pronunciation errors does not stop the session.
//
// `strikeCount` (kept for backwards compatibility with consumers showing
// "x/3") is the maximum of the three category counters — i.e. the worst
// signal so far.

const STRIKE_THRESHOLD = 3

interface UseFrameStrikesResult {
  strikeCount: number
  muletillaCount: number
  pronunciationWordCount: number
  accentuationWordCount: number
  events: StrikeEvent[]
  shouldStop: boolean
  registerFrameResponse: (frame: FrameEvaluationResponseDto) => void
  reset: () => void
}

// Normalise a word to a stable form for deduplication across frames.
// Lowercase + trim + NFKD strip combining marks (accents). Same convention
// the backend uses for muletillas; consistency here matters because the
// counter is what stops the session.
const normaliseWord = (word: string): string =>
  word.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim()

export function useFrameStrikes(): UseFrameStrikesResult {
  const [muletillaCount, setMuletillaCount] = useState(0)
  const [pronunciationWordCount, setPronunciationWordCount] = useState(0)
  const [accentuationWordCount, setAccentuationWordCount] = useState(0)
  const [events, setEvents] = useState<StrikeEvent[]>([])

  const muletillaCountRef = useRef(0)
  const pronunciationWordsRef = useRef<Set<string>>(new Set())
  const accentuationWordsRef = useRef<Set<string>>(new Set())
  const eventsRef = useRef<StrikeEvent[]>([])

  const registerFrameResponse = useCallback(
    (frame: FrameEvaluationResponseDto) => {
      const newEvents: StrikeEvent[] = []
      let muletillaDelta = 0
      const pronunciationAdds: string[] = []
      const accentuationAdds: string[] = []
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
          const key = normaliseWord(error.word)
          if (key.length === 0) continue
          if (pronunciationWordsRef.current.has(key)) continue
          pronunciationWordsRef.current.add(key)
          pronunciationAdds.push(key)
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
          const key = normaliseWord(error.word)
          if (key.length === 0) continue
          if (accentuationWordsRef.current.has(key)) continue
          accentuationWordsRef.current.add(key)
          accentuationAdds.push(key)
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
        pronunciationAdds.length === 0 &&
        accentuationAdds.length === 0
      ) {
        return
      }

      muletillaCountRef.current += muletillaDelta
      eventsRef.current = [...eventsRef.current, ...newEvents]

      setMuletillaCount(muletillaCountRef.current)
      setPronunciationWordCount(pronunciationWordsRef.current.size)
      setAccentuationWordCount(accentuationWordsRef.current.size)
      setEvents(eventsRef.current)
    },
    [],
  )

  const reset = useCallback(() => {
    muletillaCountRef.current = 0
    pronunciationWordsRef.current = new Set()
    accentuationWordsRef.current = new Set()
    eventsRef.current = []
    setMuletillaCount(0)
    setPronunciationWordCount(0)
    setAccentuationWordCount(0)
    setEvents([])
  }, [])

  const shouldStop =
    muletillaCount >= STRIKE_THRESHOLD ||
    pronunciationWordCount >= STRIKE_THRESHOLD ||
    accentuationWordCount >= STRIKE_THRESHOLD

  const strikeCount = Math.max(
    muletillaCount,
    pronunciationWordCount,
    accentuationWordCount,
  )

  return {
    strikeCount,
    muletillaCount,
    pronunciationWordCount,
    accentuationWordCount,
    events,
    shouldStop,
    registerFrameResponse,
    reset,
  }
}
