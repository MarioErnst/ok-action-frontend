// Threshold in dB below 0 dBFS. Values above this count as speech.
// -50 dB works well for typical microphone setups in quiet environments.
const SPEECH_THRESHOLD_DB = -50
const SILENCE_TIMEOUT_MS = 1500

export type VoiceCallback = (isSpeaking: boolean) => void

export class VoiceActivityDetector {
  private audioCtx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private currentlySpeaking = false
  private stopped = false

  async start(onVoiceChange: VoiceCallback): Promise<void> {
    this.stopped = false
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })

      this.audioCtx = new AudioContext()
      // iOS Safari creates AudioContext in 'suspended' state; resume() activates it.
      await this.audioCtx.resume()
      const source = this.audioCtx.createMediaStreamSource(this.stream)
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 1024
      source.connect(this.analyser)
    } catch (err) {
      // Clean up partial state (stream, audio context) before re-raising so
      // microphone indicator turns off and no AudioContext is leaked.
      this.stop()
      throw err
    }

    const buffer = new Float32Array(this.analyser.fftSize)

    this.intervalId = setInterval(() => {
      if (!this.analyser) return
      this.analyser.getFloatTimeDomainData(buffer)

      // RMS amplitude -> dBFS
      const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / buffer.length)
      const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity

      if (db > SPEECH_THRESHOLD_DB) {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer)
          this.silenceTimer = null
        }
        if (!this.currentlySpeaking) {
          this.currentlySpeaking = true
          onVoiceChange(true)
        }
      } else if (this.currentlySpeaking && !this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          if (this.stopped) return
          this.currentlySpeaking = false
          this.silenceTimer = null
          onVoiceChange(false)
        }, SILENCE_TIMEOUT_MS)
      }
    }, 50)
  }

  stop(): void {
    this.stopped = true
    if (this.intervalId) clearInterval(this.intervalId)
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
    this.stream?.getTracks().forEach((t) => t.stop())
    if (this.audioCtx?.state !== 'closed') this.audioCtx?.close()
    this.audioCtx = null
    this.analyser = null
    this.stream = null
    this.intervalId = null
    this.silenceTimer = null
    this.currentlySpeaking = false
  }
}
