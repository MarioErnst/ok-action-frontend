// Captures audio frames in parallel to the main full-audio MediaRecorder.
// Drives a single MediaRecorder with a fine timeslice (default 100 ms)
// and assembles frame blobs from chunk ranges when the orchestrator
// calls cut().
//
// Frame semantics:
//   - A frame spans from currentFrameStartedAt until the cut() moment.
//   - Each emitted frame Blob is prepended with the first chunk produced
//     by the recorder (the init segment with WebM EBML/Segment headers)
//     when the frame does not already start at chunk index 0. Decoders
//     need that init segment to interpret subsequent clusters.
//   - The next frame begins overlapMs (default 500 ms) before the cut
//     instant. The chunks inside the overlap window appear in two
//     consecutive frames so a muletilla pegada at the boundary is not
//     truncated.
//   - frameIndex is correlative starting at 0.
//
// The frame recorder does not own the noise floor, pause detection, or
// the main full-audio recorder. The orchestrator wires those together
// and calls cut() on this instance when the PauseDetector fires.

export type FrameCause = 'pause' | 'force_cut'

export interface AudioFrameEvent {
  frameIndex: number
  blob: Blob
  // Milliseconds from the recording start to the frame's logical start.
  // For frameIndex > 0 this includes the overlapMs into the previous frame.
  startMsRelative: number
  // Milliseconds from the recording start to the cut moment.
  endMsRelative: number
  cause: FrameCause
}

interface FrameRecorderOptions {
  // Timeslice for ondataavailable. Default 100 ms — small enough to make
  // the overlap window granular without producing too many tiny chunks.
  timesliceMs?: number
  // Audio that re-appears at the start of the next frame after a cut.
  // Default 500 ms.
  overlapMs?: number
  // Override MIME type. By default we pick the first supported one in
  // priority order. iOS Safari typically lands on audio/mp4; everywhere
  // else on audio/webm;codecs=opus.
  mimeType?: string
}

const DEFAULTS: Required<Omit<FrameRecorderOptions, 'mimeType'>> = {
  timesliceMs: 100,
  overlapMs: 500,
}

interface Chunk {
  blob: Blob
  ts: number
}

function selectMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export class FrameRecorder {
  private readonly mimeType: string
  private readonly timesliceMs: number
  private readonly overlapMs: number

  private recorder: MediaRecorder | null = null
  private chunks: Chunk[] = []
  private headerChunk: Blob | null = null
  private recordingStartedAt = 0
  private currentFrameStartIndex = 0
  private currentFrameStartedAt = 0
  private frameIndex = 0
  private listener: ((event: AudioFrameEvent) => void) | null = null

  constructor(
    private readonly stream: MediaStream,
    options: FrameRecorderOptions = {},
  ) {
    this.mimeType = options.mimeType ?? selectMimeType()
    this.timesliceMs = options.timesliceMs ?? DEFAULTS.timesliceMs
    this.overlapMs = options.overlapMs ?? DEFAULTS.overlapMs
  }

  start(listener: (event: AudioFrameEvent) => void): void {
    if (this.recorder) {
      throw new Error('FrameRecorder already started')
    }
    const recorder = new MediaRecorder(
      this.stream,
      this.mimeType ? { mimeType: this.mimeType } : {},
    )
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return
      const ts = performance.now()
      this.chunks.push({ blob: event.data, ts })
      if (this.headerChunk === null) {
        this.headerChunk = event.data
      }
    }
    this.recorder = recorder
    this.listener = listener
    this.chunks = []
    this.headerChunk = null
    this.recordingStartedAt = performance.now()
    this.currentFrameStartedAt = this.recordingStartedAt
    this.currentFrameStartIndex = 0
    this.frameIndex = 0
    recorder.start(this.timesliceMs)
  }

  cut(cause: FrameCause): void {
    if (!this.recorder || !this.listener) return
    const now = performance.now()

    const frameSlice = this.chunks.slice(this.currentFrameStartIndex)
    if (frameSlice.length === 0) return

    const blobParts: Blob[] = []
    // Prepend the init segment when the frame does not already include it.
    if (this.headerChunk && this.currentFrameStartIndex > 0) {
      blobParts.push(this.headerChunk)
    }
    for (const c of frameSlice) {
      blobParts.push(c.blob)
    }
    const blob = new Blob(blobParts, { type: this.recorder.mimeType })

    this.listener({
      frameIndex: this.frameIndex,
      blob,
      startMsRelative: this.currentFrameStartedAt - this.recordingStartedAt,
      endMsRelative: now - this.recordingStartedAt,
      cause,
    })

    // Advance the cursor: the next frame starts overlapMs back from now.
    const overlapBoundary = now - this.overlapMs
    let nextStartIndex = this.chunks.length
    while (
      nextStartIndex > 0 &&
      this.chunks[nextStartIndex - 1].ts >= overlapBoundary
    ) {
      nextStartIndex--
    }

    this.currentFrameStartIndex = nextStartIndex
    this.currentFrameStartedAt =
      this.chunks[nextStartIndex]?.ts ?? now
    this.frameIndex++
  }

  async stop(): Promise<void> {
    const recorder = this.recorder
    if (!recorder) return
    return new Promise<void>((resolve) => {
      const finish = () => {
        this.recorder = null
        this.listener = null
        resolve()
      }
      recorder.onstop = finish
      if (recorder.state === 'inactive') {
        finish()
      } else {
        recorder.stop()
      }
    })
  }
}
