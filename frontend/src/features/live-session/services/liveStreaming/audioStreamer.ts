// Streams raw 16 kHz mono PCM16 audio from a MediaStream into a callback.
//
// Why PCM16 mono at 16 kHz: that is the wire format the backend
// supervisor needs to feed AssemblyAI streaming (which expects 16 kHz
// signed-LE PCM). Doing the resampling and quantization here keeps the
// backend a thin transport that just forwards bytes.
//
// Why AudioWorklet with a ScriptProcessor fallback: AudioWorklet is the
// modern way and runs in an audio thread (no main-thread jitter). iOS
// Safari supports it from 14.5+; older iOS Safari versions still fall
// back to the deprecated-but-functional ScriptProcessorNode. Both paths
// produce the same chunk shape so the rest of the pipeline does not
// have to care.
//
// The streamer never owns the MediaStream. The caller passes one in and
// is responsible for releasing it. We just plug into it.

const TARGET_SAMPLE_RATE = 16000
const CHUNK_SAMPLES = 1600 // 100 ms at 16 kHz
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096

export type PcmChunkListener = (chunk: Uint8Array) => void

interface AudioStreamerOptions {
  // Override the target sample rate. The backend pipeline expects 16
  // kHz mono; exposing this only for tests / future tweaking.
  targetSampleRate?: number
  // Samples per emitted chunk. Default 1600 (= 100 ms at 16 kHz).
  // Smaller chunks mean lower latency but more WS frames; 100 ms is a
  // sweet spot that keeps the WS busy without overflowing it.
  chunkSamples?: number
}

export class LiveAudioStreamer {
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private gainSink: GainNode | null = null
  private listener: PcmChunkListener | null = null

  // Accumulator for resampled PCM samples between flushes. We chunk on
  // sample count, not on processor callback boundaries, so the WS frames
  // stay regular regardless of the underlying buffer size.
  private accumulator: Float32Array = new Float32Array(0)

  private readonly targetSampleRate: number
  private readonly chunkSamples: number

  constructor(options: AudioStreamerOptions = {}) {
    this.targetSampleRate = options.targetSampleRate ?? TARGET_SAMPLE_RATE
    this.chunkSamples = options.chunkSamples ?? CHUNK_SAMPLES
  }

  async start(stream: MediaStream, listener: PcmChunkListener): Promise<void> {
    if (this.context) {
      throw new Error('LiveAudioStreamer already started')
    }
    this.listener = listener

    // Some Safari builds require AudioContext to inherit the sampleRate
    // from the MediaStream; we cannot force 16 kHz at the context level
    // there. We let the browser pick its native rate and resample in
    // software inside the worklet/processor.
    const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) {
      throw new Error('Web Audio API not available')
    }
    const context = new Ctx()
    this.context = context

    const source = context.createMediaStreamSource(stream)
    this.source = source

    // We need to keep the graph running. Browsers garbage-collect orphan
    // ScriptProcessorNodes if nothing pulls from the output; connecting
    // to a silent gain at the destination is the common workaround that
    // does not produce audible feedback.
    const sink = context.createGain()
    sink.gain.value = 0
    sink.connect(context.destination)
    this.gainSink = sink

    const inputSampleRate = context.sampleRate

    if (typeof context.audioWorklet?.addModule === 'function') {
      try {
        await this.attachWorklet(context, source, sink, inputSampleRate)
        return
      } catch (exc) {
        // Worklet path failed for some reason. Fall back gracefully.
        console.warn('AudioWorklet path failed; using ScriptProcessor', exc)
      }
    }

    this.attachScriptProcessor(source, sink, inputSampleRate)
  }

  async stop(): Promise<void> {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null
      try {
        this.workletNode.disconnect()
      } catch {
        // already disconnected
      }
      this.workletNode = null
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null
      try {
        this.scriptProcessor.disconnect()
      } catch {
        // already disconnected
      }
      this.scriptProcessor = null
    }
    try {
      this.source?.disconnect()
    } catch {
      // already disconnected
    }
    this.source = null
    try {
      this.gainSink?.disconnect()
    } catch {
      // already disconnected
    }
    this.gainSink = null

    try {
      await this.context?.close()
    } catch {
      // closing twice or on certain Safari builds throws; ignore on tear-down.
    }
    this.context = null
    this.listener = null
    this.accumulator = new Float32Array(0)
  }

  private async attachWorklet(
    context: AudioContext,
    source: MediaStreamAudioSourceNode,
    sink: GainNode,
    inputSampleRate: number,
  ): Promise<void> {
    const moduleUrl = buildWorkletModuleUrl()
    await context.audioWorklet.addModule(moduleUrl)
    URL.revokeObjectURL(moduleUrl)

    const node = new AudioWorkletNode(context, 'live-pcm-worklet', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    })
    node.port.onmessage = (event) => {
      const samples = event.data as Float32Array
      if (!samples || !this.listener) return
      const resampled = resampleToTarget(samples, inputSampleRate, this.targetSampleRate)
      this.pushSamples(resampled)
    }
    source.connect(node)
    node.connect(sink)
    this.workletNode = node
  }

  private attachScriptProcessor(
    source: MediaStreamAudioSourceNode,
    sink: GainNode,
    inputSampleRate: number,
  ): void {
    if (!this.context) return
    const processor = this.context.createScriptProcessor(
      SCRIPT_PROCESSOR_BUFFER_SIZE,
      1,
      1,
    )
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      const copy = new Float32Array(input.length)
      copy.set(input)
      const resampled = resampleToTarget(copy, inputSampleRate, this.targetSampleRate)
      this.pushSamples(resampled)
    }
    source.connect(processor)
    processor.connect(sink)
    this.scriptProcessor = processor
  }

  private pushSamples(samples: Float32Array): void {
    if (samples.length === 0 || !this.listener) return
    const merged = new Float32Array(this.accumulator.length + samples.length)
    merged.set(this.accumulator, 0)
    merged.set(samples, this.accumulator.length)
    this.accumulator = merged

    while (this.accumulator.length >= this.chunkSamples && this.listener) {
      const window = this.accumulator.subarray(0, this.chunkSamples)
      const pcm = floatTo16BitPcm(window)
      this.listener(pcm)
      this.accumulator = this.accumulator.subarray(this.chunkSamples)
    }
  }
}

// Build a chunk of digital silence (all zeros) in the same PCM16 mono
// 16 kHz format the streamer emits. Used by the orchestrator to push a
// short pad through the WS right after the server says ready, which
// nudges the Live model out of cold-start before the user speaks.
export function buildSilencePcm(
  durationMs: number,
  sampleRate: number = TARGET_SAMPLE_RATE,
): Uint8Array {
  if (durationMs <= 0) return new Uint8Array(0)
  const samples = Math.round((durationMs / 1000) * sampleRate)
  // PCM16 = 2 bytes per sample. Uint8Array is zero-initialized.
  return new Uint8Array(samples * 2)
}

function floatTo16BitPcm(input: Float32Array): Uint8Array {
  const out = new ArrayBuffer(input.length * 2)
  const view = new DataView(out)
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]))
    // Symmetric quantization keeps DC bias small enough for the model.
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(out)
}

// Naive linear-interpolation resampler. The input rate is whatever the
// browser hands us (typically 44.1 or 48 kHz); the output is fixed at
// targetSampleRate. Linear is acceptable for speech recognition; the
// downstream ASR is robust to mild aliasing.
function resampleToTarget(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate === outputRate) return input
  const ratio = inputRate / outputRate
  const outLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio
    const lower = Math.floor(srcIndex)
    const upper = Math.min(lower + 1, input.length - 1)
    const frac = srcIndex - lower
    output[i] = input[lower] * (1 - frac) + input[upper] * frac
  }
  return output
}

// We inline the worklet source as a string and serve it via Blob URL.
// Bundlers do not need to copy a separate file and the production build
// still emits exactly one chunk for the streamer.
function buildWorkletModuleUrl(): string {
  const source = `
    class LivePcmWorklet extends AudioWorkletProcessor {
      process(inputs) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;
        const channel = input[0];
        if (!channel || channel.length === 0) return true;
        // Copy because the buffer is reused by the host on the next callback.
        const copy = new Float32Array(channel.length);
        copy.set(channel);
        this.port.postMessage(copy, [copy.buffer]);
        return true;
      }
    }
    registerProcessor('live-pcm-worklet', LivePcmWorklet);
  `
  const blob = new Blob([source], { type: 'application/javascript' })
  return URL.createObjectURL(blob)
}
