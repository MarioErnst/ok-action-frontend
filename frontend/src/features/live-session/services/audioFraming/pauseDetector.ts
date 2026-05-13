import type { NoiseCalibration } from '../../domain/NoiseCalibration'

// Detects pauses in the user's speech to know when a frame is "safe to
// cut" without breaking a word mid-utterance. A pause counts when:
//   1. The short rolling-window RMS drops by relativeDropDb relative to
//      the long rolling-window RMS (default 15 dB), AND
//   2. The short rolling-window RMS is within noiseFloorMarginDb of the
//      calibrated noise floor (default 6 dB) — so a quieter passage of
//      speech does not count as silence.
//
// We also emit a forced cut after maxFrameMs to bound frame length when
// the user speaks without pausing. The detector itself only fires
// callbacks; the frame recorder is responsible for actually cutting the
// audio and for calling resetFrameTimer when a new frame begins.

interface PauseDetectorOptions {
  // Minimum frame duration before pause detection arms. Default 5000 ms.
  minFrameMs?: number
  // Maximum frame duration; emits force_cut at this point regardless of
  // pause status. Default 8000 ms.
  maxFrameMs?: number
  // Sliding window over which the short-term RMS is averaged. Default 200 ms.
  pauseShortWindowMs?: number
  // Sliding window over which the long-term RMS is averaged. Default 1000 ms.
  pauseLongWindowMs?: number
  // Required dB drop of short vs long window to consider the moment a pause.
  // Default 15 dB.
  relativeDropDb?: number
  // Maximum dB the short-window RMS may exceed the noise floor and still
  // count as silence. Default 6 dB.
  noiseFloorMarginDb?: number
  // Sampling period of the detection loop. Default 50 ms (4 samples per
  // short window, 20 per long window).
  sampleIntervalMs?: number
}

interface PauseDetectorCallbacks {
  onPause: () => void
  onForceCut: () => void
}

const DEFAULTS: Required<PauseDetectorOptions> = {
  minFrameMs: 5000,
  maxFrameMs: 8000,
  pauseShortWindowMs: 200,
  pauseLongWindowMs: 1000,
  relativeDropDb: 15,
  noiseFloorMarginDb: 6,
  sampleIntervalMs: 50,
}

function ratioToDb(ratio: number): number {
  return 20 * Math.log10(Math.max(ratio, 1e-9))
}

export class PauseDetector {
  private readonly options: Required<PauseDetectorOptions>
  private readonly buffer: Uint8Array<ArrayBuffer>
  private samples: Array<{ ts: number; rms: number }> = []
  private frameStartedAt = 0
  private intervalId: number | null = null
  private callbacks: PauseDetectorCallbacks | null = null

  constructor(
    private readonly analyser: AnalyserNode,
    private readonly calibration: NoiseCalibration,
    options: PauseDetectorOptions = {},
  ) {
    this.options = { ...DEFAULTS, ...options }
    this.buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize))
  }

  start(callbacks: PauseDetectorCallbacks): void {
    if (this.intervalId !== null) return
    this.callbacks = callbacks
    this.frameStartedAt = performance.now()
    this.samples = []
    this.intervalId = window.setInterval(
      () => this.tick(),
      this.options.sampleIntervalMs,
    )
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.callbacks = null
  }

  // Called by the frame recorder after a frame cut so the next frame's
  // min/max counters start fresh. Rolling samples are kept so the long
  // window stays meaningful across the boundary.
  resetFrameTimer(): void {
    this.frameStartedAt = performance.now()
  }

  private tick(): void {
    if (!this.callbacks) return
    const now = performance.now()

    this.analyser.getByteTimeDomainData(this.buffer)
    let sumSquares = 0
    for (let i = 0; i < this.buffer.length; i++) {
      const normalized = (this.buffer[i] - 128) / 128
      sumSquares += normalized * normalized
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length)
    this.samples.push({ ts: now, rms })

    // Drop samples older than the long window.
    const trimAt = now - this.options.pauseLongWindowMs
    while (this.samples.length > 0 && this.samples[0].ts < trimAt) {
      this.samples.shift()
    }

    const frameMs = now - this.frameStartedAt

    if (frameMs >= this.options.maxFrameMs) {
      this.callbacks.onForceCut()
      return
    }

    if (frameMs < this.options.minFrameMs) return

    const shortAt = now - this.options.pauseShortWindowMs
    const shortSamples = this.samples.filter((s) => s.ts >= shortAt)
    if (shortSamples.length === 0) return

    const shortMean =
      shortSamples.reduce((acc, v) => acc + v.rms, 0) / shortSamples.length
    const longMean =
      this.samples.reduce((acc, v) => acc + v.rms, 0) / this.samples.length

    if (longMean <= 1e-9) return

    const dropDb = ratioToDb(shortMean / longMean)
    const noiseFloorMarginDb = ratioToDb(
      shortMean / Math.max(this.calibration.noise_floor_rms, 1e-9),
    )

    const droppedEnough = -dropDb >= this.options.relativeDropDb
    const nearFloor = noiseFloorMarginDb <= this.options.noiseFloorMarginDb

    if (droppedEnough && nearFloor) {
      this.callbacks.onPause()
    }
  }
}
