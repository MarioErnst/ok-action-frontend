import { useCallback, useEffect, useRef, useState } from 'react'
import { VoiceActivityDetector } from '../../services/voiceActivityDetector'

export function useVoiceActivity() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const detectorRef = useRef<VoiceActivityDetector | null>(null)

  const stopListening = useCallback(() => {
    detectorRef.current?.stop()
    detectorRef.current = null
    setIsSpeaking(false)
  }, [])

  const startListening = useCallback(async () => {
    // Prevent orphaning an already-running detector if called while active.
    if (detectorRef.current) return
    const detector = new VoiceActivityDetector()
    detectorRef.current = detector
    await detector.start(setIsSpeaking)
  }, [])

  // Stop the detector if the component unmounts while listening is active.
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return { isSpeaking, startListening, stopListening }
}
