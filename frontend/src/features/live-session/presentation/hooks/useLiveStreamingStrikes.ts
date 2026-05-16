import { useCallback, useRef, useState } from 'react'

import type { StreamingStrikeEvent } from '../../domain/StreamingEvent'
import type { StrikeEvent } from '../../domain/StrikeEvent'


// Strike counter for the Gemini Live streaming pipeline.
//
// Differences from the previous frame-eval counter:
//   - Threshold is 1: every valid strike emitted by the backend cuts
//     the session immediately. There is no "second chance" because the
//     model already applies its own anti-hallucination filter
//     (transcript_snippet requirement) on the backend.
//   - Counters are independent per category. One muletilla + one
//     pronunciation error does NOT stop the session — but in practice
//     either one alone will.
//   - No batching, no frame correlation. registerStrike fires per
//     event received over the WebSocket.
//
// The hook intentionally keeps the same surface shape as the previous
// useFrameStrikes (`muletillaCount`, `pronunciationErrorCount`,
// `accentuationErrorCount`, `shouldStop`, `events`, `reset`) so the
// session orchestrator (useLiveSession) consumes it the same way.

const STRIKE_THRESHOLD = 1


interface UseLiveStreamingStrikesResult {
  muletillaCount: number
  pronunciationErrorCount: number
  accentuationErrorCount: number
  events: StrikeEvent[]
  shouldStop: boolean
  // Anchor the strike timestamps to the recording start so the feedback
  // page can mark events on the audio timeline. Caller invokes this once
  // recording begins; if it is never called, timestamps fall back to the
  // raw wall-clock delta which still preserves ordering.
  markRecordingStart: (epochMs: number) => void
  registerStrike: (event: StreamingStrikeEvent) => void
  reset: () => void
}


export function useLiveStreamingStrikes(): UseLiveStreamingStrikesResult {
  const [muletillaCount, setMuletillaCount] = useState(0)
  const [pronunciationErrorCount, setPronunciationErrorCount] = useState(0)
  const [accentuationErrorCount, setAccentuationErrorCount] = useState(0)
  const [events, setEvents] = useState<StrikeEvent[]>([])

  const muletillaCountRef = useRef(0)
  const pronunciationErrorCountRef = useRef(0)
  const accentuationErrorCountRef = useRef(0)
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

    let mappedKind: StrikeEvent['kind']
    if (event.category === 'muletillas') {
      mappedKind = 'muletilla'
      muletillaCountRef.current += 1
      setMuletillaCount(muletillaCountRef.current)
    } else if (event.category === 'pronunciation') {
      mappedKind = 'pronunciation'
      pronunciationErrorCountRef.current += 1
      setPronunciationErrorCount(pronunciationErrorCountRef.current)
    } else {
      mappedKind = 'accentuation'
      accentuationErrorCountRef.current += 1
      setAccentuationErrorCount(accentuationErrorCountRef.current)
    }

    const strike: StrikeEvent = {
      kind: mappedKind,
      // No frame correlation in streaming. We surface 0 so the existing
      // UI that uses this field as a key/marker keeps working without
      // changes; nothing in the UI tree reads frameIndex semantically.
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
    pronunciationErrorCountRef.current = 0
    accentuationErrorCountRef.current = 0
    eventsRef.current = []
    recordingStartedAtRef.current = null
    setMuletillaCount(0)
    setPronunciationErrorCount(0)
    setAccentuationErrorCount(0)
    setEvents([])
  }, [])

  const shouldStop =
    muletillaCount >= STRIKE_THRESHOLD ||
    pronunciationErrorCount >= STRIKE_THRESHOLD ||
    accentuationErrorCount >= STRIKE_THRESHOLD

  return {
    muletillaCount,
    pronunciationErrorCount,
    accentuationErrorCount,
    events,
    shouldStop,
    markRecordingStart,
    registerStrike,
    reset,
  }
}
