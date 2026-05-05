// Uses Web Audio API to capture PCM 16-bit 16kHz, required by Gemini Live API.
// MediaRecorder is NOT used here because it produces compressed formats (WebM/MP4).

const TARGET_SAMPLE_RATE = 16000
const BUFFER_SIZE = 4096

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767
  }
  return int16
}

export class AudioCapture {
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private stream: MediaStream | null = null

  async start(onChunk: (pcm: ArrayBuffer) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: TARGET_SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    this.context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    this.source = this.context.createMediaStreamSource(this.stream)
    // ScriptProcessorNode is deprecated but has universal browser support.
    // AudioWorklet is the modern alternative but requires a separate worker file.
    this.processor = this.context.createScriptProcessor(BUFFER_SIZE, 1, 1)

    this.processor.onaudioprocess = (event) => {
      const float32 = event.inputBuffer.getChannelData(0)
      const int16 = float32ToInt16(float32)
      onChunk(int16.buffer.slice(0))
    }

    this.source.connect(this.processor)
    this.processor.connect(this.context.destination)
  }

  stop(): void {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.context?.close()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.processor = null
    this.source = null
    this.context = null
    this.stream = null
  }
}
