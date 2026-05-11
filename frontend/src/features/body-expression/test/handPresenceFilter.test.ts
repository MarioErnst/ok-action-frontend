import { describe, expect, it } from 'vitest'
import { HandPresenceFilter } from '../services/handPresenceFilter'
import type { PoseLandmarkPoint } from '../services/poseDetectionService'

function point(x: number, y: number, visibility = 0.95): PoseLandmarkPoint {
  return { x, y, z: 0, visibility }
}

function pose(): PoseLandmarkPoint[] {
  const landmarks = Array.from({ length: 33 }, () => point(0, 0, 0))
  landmarks[11] = point(0.38, 0.28)
  landmarks[12] = point(0.62, 0.28)
  landmarks[13] = point(0.34, 0.43)
  landmarks[14] = point(0.66, 0.43)
  landmarks[15] = point(0.30, 0.56)
  landmarks[16] = point(0.70, 0.56)
  return landmarks
}

describe('HandPresenceFilter', () => {
  it('does not activate from one isolated wrist frame', () => {
    const filter = new HandPresenceFilter()
    const result = filter.update(pose())

    expect(result.left).toBe(false)
    expect(result.right).toBe(false)
  })

  it('activates after sustained valid hand evidence', () => {
    const filter = new HandPresenceFilter()

    filter.update(pose())
    filter.update(pose())
    const result = filter.update(pose())

    expect(result.left).toBe(true)
    expect(result.right).toBe(true)
  })

  it('rejects a wrist without same-side elbow support', () => {
    const filter = new HandPresenceFilter()
    const landmarks = pose()
    landmarks[13] = point(0.34, 0.43, 0.1)

    filter.update(landmarks)
    filter.update(landmarks)
    const result = filter.update(landmarks)

    expect(result.left).toBe(false)
    expect(result.right).toBe(true)
  })

  it('cuts off an impossible wrist jump immediately', () => {
    const filter = new HandPresenceFilter()

    filter.update(pose())
    filter.update(pose())
    expect(filter.update(pose()).left).toBe(true)

    const jumped = pose()
    jumped[15] = point(0.95, 0.10)
    const result = filter.update(jumped)

    expect(result.left).toBe(false)
  })
})
