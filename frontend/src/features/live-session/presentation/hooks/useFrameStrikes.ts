import { useCallback, useRef, useState } from 'react'
import type { FrameEvaluationResponseDto } from '../../infrastructure/dto/FrameEvaluationDtos'
import type { StrikeEvent } from '../../domain/StrikeEvent'

// Strike rules agreed for the live session redesign:
//   - Each muletilla detected in a frame adds its count to the global
//     counter (no cap per frame).
//   - If any of the four accentuation scores in a frame falls below
//     STRIKE_LOW_SCORE_THRESHOLD, the frame contributes 1 strike (capped).
//   - If any of the four pronunciation scores in a frame falls below
//     STRIKE_LOW_SCORE_THRESHOLD, the frame contributes 1 strike (capped).
//   - When the global counter reaches STRIKE_THRESHOLD, shouldStop turns
//     true and the orchestrator initiates the auto-stop flow.
// Counter and events are not rendered to the user during recording; they
// only feed the stop decision and the post-stop feedback screen.

const STRIKE_THRESHOLD = 3
const STRIKE_LOW_SCORE_THRESHOLD = 55

interface UseFrameStrikesResult {
  strikeCount: number
  events: StrikeEvent[]
  shouldStop: boolean
  registerFrameResponse: (frame: FrameEvaluationResponseDto) => void
  reset: () => void
}

export function useFrameStrikes(): UseFrameStrikesResult {
  const [strikeCount, setStrikeCount] = useState(0)
  const [events, setEvents] = useState<StrikeEvent[]>([])
  const countRef = useRef(0)
  const eventsRef = useRef<StrikeEvent[]>([])

  const registerFrameResponse = useCallback(
    (frame: FrameEvaluationResponseDto) => {
      const newEvents: StrikeEvent[] = []
      let delta = 0
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
          delta += item.count
        }
      }

      if (frame.accentuation) {
        const min = Math.min(
          frame.accentuation.pronunciation_score,
          frame.accentuation.rhythm_score,
          frame.accentuation.intonation_score,
          frame.accentuation.stress_score,
        )
        if (min < STRIKE_LOW_SCORE_THRESHOLD) {
          newEvents.push({
            kind: 'accentuation',
            frameIndex: frame.frame_index,
            timestampMs: now,
            detail: `Score parcial mínimo: ${min}`,
          })
          delta += 1
        }
      }

      if (frame.pronunciation) {
        const min = Math.min(
          frame.pronunciation.vowel_score,
          frame.pronunciation.consonant_score,
          frame.pronunciation.fluency_score,
          frame.pronunciation.intelligibility_score,
        )
        if (min < STRIKE_LOW_SCORE_THRESHOLD) {
          newEvents.push({
            kind: 'pronunciation',
            frameIndex: frame.frame_index,
            timestampMs: now,
            detail: `Score parcial mínimo: ${min}`,
          })
          delta += 1
        }
      }

      if (delta === 0 && newEvents.length === 0) return

      countRef.current += delta
      eventsRef.current = [...eventsRef.current, ...newEvents]
      setStrikeCount(countRef.current)
      setEvents(eventsRef.current)
    },
    [],
  )

  const reset = useCallback(() => {
    countRef.current = 0
    eventsRef.current = []
    setStrikeCount(0)
    setEvents([])
  }, [])

  const shouldStop = strikeCount >= STRIKE_THRESHOLD

  return { strikeCount, events, shouldStop, registerFrameResponse, reset }
}
