import { useRef, useState } from 'react'
import { VoiceActivityDetector } from '../../services/voiceActivityDetector'

export function useVoiceActivity() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const detectorRef = useRef<VoiceActivityDetector | null>(null)

  async function startListening() {
    const detector = new VoiceActivityDetector()
    detectorRef.current = detector
    await detector.start(setIsSpeaking)
  }

  function stopListening() {
    detectorRef.current?.stop()
    detectorRef.current = null
    setIsSpeaking(false)
  }

  return { isSpeaking, startListening, stopListening }
}
