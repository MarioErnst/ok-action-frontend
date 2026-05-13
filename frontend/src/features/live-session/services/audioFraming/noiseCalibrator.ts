import type { NoiseCalibration } from '../../domain/NoiseCalibration'

// Captures the ambient noise floor from an already-wired AnalyserNode
// across a brief silence window (default 2 seconds). The caller is
// responsible for telling the user to stay quiet during calibration
// and for keeping the audio graph alive afterwards so the pause
// detector can reuse the same analyser.
//
// Returning the std along with the mean lets the caller flag a noisy
// environment (high std) and either re-run calibration or fall back to
// a generous absolute threshold.

interface NoiseCalibratorOptions {
  // Total calibration window. Default 2000 ms.
  durationMs?: number
  // Sampling period inside the window. Default 100 ms — gives 20 buckets
  // at the default duration which is enough for a stable mean while
  // staying short enough to feel snappy in the UI.
  bucketMs?: number
}

export async function calibrateNoiseFloor(
  analyser: AnalyserNode,
  options: NoiseCalibratorOptions = {},
): Promise<NoiseCalibration> {
  const durationMs = options.durationMs ?? 2000
  const bucketMs = options.bucketMs ?? 100

  const timeData = new Uint8Array(analyser.fftSize)
  const rmsValues: number[] = []

  return new Promise<NoiseCalibration>((resolve) => {
    const startedAt = performance.now()

    const intervalId = window.setInterval(() => {
      analyser.getByteTimeDomainData(timeData)
      let sumSquares = 0
      for (let i = 0; i < timeData.length; i++) {
        // Normalize 0..255 (where 128 is silence) to -1..1.
        const normalized = (timeData[i] - 128) / 128
        sumSquares += normalized * normalized
      }
      const rms = Math.sqrt(sumSquares / timeData.length)
      rmsValues.push(rms)

      if (performance.now() - startedAt >= durationMs) {
        window.clearInterval(intervalId)

        const mean =
          rmsValues.length > 0
            ? rmsValues.reduce((acc, v) => acc + v, 0) / rmsValues.length
            : 0
        const variance =
          rmsValues.length > 0
            ? rmsValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
              rmsValues.length
            : 0
        const std = Math.sqrt(variance)

        resolve({
          noise_floor_rms: mean,
          noise_floor_std: std,
          calibrated_at_ms: performance.now(),
        })
      }
    }, bucketMs)
  })
}
