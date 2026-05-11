import { describe, expect, it } from 'vitest'
import {
  buildBodyCalibration,
  deriveOverallScore,
  summarizeBodyExpression,
} from '../services/bodyExpressionAnalysis'
import type { PoseDetectionFrame, PoseLandmarkPoint } from '../services/poseDetectionService'

function point(x: number, y: number, visibility = 0.95): PoseLandmarkPoint {
  return { x, y, z: 0, visibility }
}

function frame(timestampMs: number, wristOffset = 0): PoseDetectionFrame {
  const landmarks = Array.from({ length: 33 }, () => point(0, 0, 0))
  landmarks[11] = point(0.38, 0.28)
  landmarks[12] = point(0.62, 0.28)
  landmarks[13] = point(0.34, 0.43)
  landmarks[14] = point(0.66, 0.43)
  landmarks[15] = point(0.30 + wristOffset, 0.56)
  landmarks[16] = point(0.70 - wristOffset, 0.56)
  landmarks[23] = point(0.42, 0.62)
  landmarks[24] = point(0.58, 0.62)
  landmarks[25] = point(0.44, 0.78)
  landmarks[26] = point(0.56, 0.78)
  landmarks[27] = point(0.45, 0.93)
  landmarks[28] = point(0.55, 0.93)
  return { timestampMs, landmarks }
}

describe('bodyExpressionAnalysis', () => {
  it('calibrates with stable full-body visibility', () => {
    const calibration = buildBodyCalibration([frame(0), frame(100), frame(200)])
    expect(calibration.qualityPct).toBeGreaterThan(70)
    expect(calibration.framingMode).toBe('full_body')
  })

  it('summarizes persisted metrics in 0..100', () => {
    const frames = [
      frame(0),
      frame(100, 0.03),
      frame(200, -0.02),
      frame(300, 0.04),
      frame(400, 0.02),
      frame(500, -0.01),
    ]
    const calibration = buildBodyCalibration(frames)
    const metrics = summarizeBodyExpression(frames, calibration)

    expect(metrics.trackedPct).toBe(100)
    expect(metrics.handsVisiblePct).toBeGreaterThan(0)
    expect(metrics.framingMode).toBe('full_body')
    expect(deriveOverallScore(metrics)).toBeGreaterThan(0)
  })

  it('accepts medium-visibility landmarks for metrics', () => {
    const mediumVisibility = frame(0)
    mediumVisibility.landmarks = mediumVisibility.landmarks.map((landmark) => ({
      ...landmark,
      visibility: landmark.visibility === 0 ? 0 : 0.45,
    }))

    const calibration = buildBodyCalibration([mediumVisibility])
    const metrics = summarizeBodyExpression([mediumVisibility], calibration)

    expect(calibration.qualityPct).toBeGreaterThan(0)
    expect(metrics.trackedPct).toBe(100)
  })

  it('keeps body tracking when hands are filtered out', () => {
    const noHands = [frame(0), frame(100), frame(200), frame(300)]
    for (const item of noHands) {
      item.landmarks[15] = point(0.95, 0.10)
      item.landmarks[16] = point(0.05, 0.10)
    }

    const calibration = buildBodyCalibration(noHands)
    const metrics = summarizeBodyExpression(noHands, calibration)

    expect(metrics.trackedPct).toBe(100)
    expect(metrics.handsVisiblePct).toBe(0)
  })

  it('does not count low-confidence wrists as visible hands', () => {
    const lowConfidenceHands = frame(0)
    lowConfidenceHands.landmarks[15] = point(0.30, 0.56, 0.45)
    lowConfidenceHands.landmarks[16] = point(0.70, 0.56, 0.45)

    const calibration = buildBodyCalibration([lowConfidenceHands])
    const metrics = summarizeBodyExpression([lowConfidenceHands], calibration)

    expect(metrics.trackedPct).toBe(100)
    expect(metrics.handsVisiblePct).toBe(0)
  })

  it('marks invisible poses as untracked', () => {
    const invisible = frame(0)
    invisible.landmarks[11] = point(0.38, 0.28, 0.1)
    invisible.landmarks[12] = point(0.62, 0.28, 0.1)

    const calibration = buildBodyCalibration([frame(0), frame(100)])
    const metrics = summarizeBodyExpression([invisible], calibration)
    expect(metrics.trackedPct).toBe(0)
  })
})
