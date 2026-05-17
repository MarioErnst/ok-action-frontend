import { useCallback, useRef, useState } from 'react'

import type { StreamingStrikeEvent } from '../../domain/StreamingEvent'
import type { StrikeEvent } from '../../domain/StrikeEvent'


// Strike counter for the live streaming pipeline.
//
// Today the only category the backend emits over the WS is
// `muletillas`. Pronunciation and accentuation moved to the composed-
// eval flow that runs at session end (so they no longer drive a real-
// time "corten"). The hook keeps a single counter and stops as soon as
// the first valid strike arrives.
//
// Surface kept intentionally small: counter + events + shouldStop +
// reset + markRecordingStart. The session orchestrator (useLiveSession)
// consumes the counter via the auto-stop effect; the feedback page
// reads `events` to render the strike timeline.

const STRIKE_THRESHOLD = 1


interface UseLiveStreamingStrikesResult {
  muletillaCount: number
  events: StrikeEvent[]
  shouldStop: boolean
  // Anchor strike timestamps to the recording start so the feedback
  // page can mark events on the audio timeline. Caller invokes this
  // once recording begins; if it is never called, timestamps fall back
  // to a per-event delta that still preserves ordering.
  markRecordingStart: (epochMs: number) => void
  registerStrike: (event: StreamingStrikeEvent) => void
  reset: () => void
}


export function useLiveStreamingStrikes(): UseLiveStreamingStrikesResult {
  const [muletillaCount, setMuletillaCount] = useState(0)
  const [events, setEvents] = useState<StrikeEvent[]>([])

  const muletillaCountRef = useRef(0)
  const eventsRef = useRef<StrikeEvent[]>([])
  // Wall-clock epoch (ms) of the recording start. Both this and
  // event.receivedAtMs are wall-clock so the subtraction gives the
  // offset inside the recorded audio.
  const recordingStartedAtRef = useRef<number | null>(null)

  const markRecordingStart = useCallback((epochMs: number) => {
    recordingStartedAtRef.current = epochMs
  }, [])

  const registerStrike = useCallback((event: StreamingStrikeEvent) => {
    const anchor = recordingStartedAtRef.current ?? event.receivedAtMs
    const relativeMs = Math.max(0, event.receivedAtMs - anchor)

    muletillaCountRef.current += 1
    setMuletillaCount(muletillaCountRef.current)

    const strike: StrikeEvent = {
      kind: 'muletilla',
      // No frame correlation in streaming. Keep the field present for
      // backward compatibility with the feedback UI that uses it as a
      // stable key. Nothing in the tree reads frameIndex semantically.
      frameIndex: 0,
      timestampMs: relativeMs,
      detail: event.transcriptSnippet || event.word,
      severity: event.severity,
      word: event.word,
    }

    eventsRef.current = [...eventsRef.current, strike]
    setEvents(eventsRef.current)
  }, [])

  const reset = useCallback(() => {
    muletillaCountRef.current = 0
    eventsRef.current = []
    recordingStartedAtRef.current = null
    setMuletillaCount(0)
    setEvents([])
  }, [])

  const shouldStop = muletillaCount >= STRIKE_THRESHOLD

  return {
    muletillaCount,
    events,
    shouldStop,
    markRecordingStart,
    registerStrike,
    reset,
  }
}
