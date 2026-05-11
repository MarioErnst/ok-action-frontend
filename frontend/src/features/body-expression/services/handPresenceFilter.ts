import type { PoseLandmarkPoint } from './poseDetectionService'

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_ELBOW = 13
const RIGHT_ELBOW = 14
const LEFT_WRIST = 15
const RIGHT_WRIST = 16

const BODY_VISIBILITY_THRESHOLD = 0.42
const HAND_VISIBILITY_THRESHOLD = 0.50
const WINDOW_SIZE = 5
const REQUIRED_HITS = 3
const MISSING_GRACE_FRAMES = 2
const MAX_WRIST_JUMP_IN_SHOULDERS = 1.05

export type HandSide = 'left' | 'right'

export type HandPresenceResult = {
  left: boolean
  right: boolean
}

type Point = { x: number; y: number }

type SideState = {
  active: boolean
  missesRemaining: number
  hits: boolean[]
  lastAcceptedWrist: Point | null
}

const EMPTY_RESULT: HandPresenceResult = { left: false, right: false }

export class HandPresenceFilter {
  private left: SideState = createSideState()
  private right: SideState = createSideState()

  reset(): void {
    this.left = createSideState()
    this.right = createSideState()
  }

  update(landmarks: PoseLandmarkPoint[]): HandPresenceResult {
    if (!hasShoulderPair(landmarks)) {
      this.left = decaySide(this.left)
      this.right = decaySide(this.right)
      return this.current()
    }

    const shoulderWidth = Math.max(
      distance(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]),
      0.15,
    )

    this.left = updateSide(
      this.left,
      isCandidateValid(landmarks, 'left', shoulderWidth, this.left.lastAcceptedWrist),
      isHandVisible(landmarks[LEFT_WRIST]),
      landmarks[LEFT_WRIST],
    )
    this.right = updateSide(
      this.right,
      isCandidateValid(landmarks, 'right', shoulderWidth, this.right.lastAcceptedWrist),
      isHandVisible(landmarks[RIGHT_WRIST]),
      landmarks[RIGHT_WRIST],
    )

    return this.current()
  }

  current(): HandPresenceResult {
    return {
      left: this.left.active,
      right: this.right.active,
    }
  }
}

export function createEmptyHandPresence(): HandPresenceResult {
  return { ...EMPTY_RESULT }
}

export function isFilteredHandVisible(
  handPresence: HandPresenceResult | undefined,
  side: HandSide,
): boolean {
  return Boolean(handPresence?.[side])
}

function createSideState(): SideState {
  return {
    active: false,
    missesRemaining: 0,
    hits: [],
    lastAcceptedWrist: null,
  }
}

function decaySide(state: SideState): SideState {
  if (!state.active) return { ...state, hits: pushHit(state.hits, false) }
  const missesRemaining = state.missesRemaining - 1
  return {
    ...state,
    active: missesRemaining >= 0,
    missesRemaining,
    hits: pushHit(state.hits, false),
  }
}

function updateSide(
  state: SideState,
  candidateValid: boolean,
  wristVisible: boolean,
  wrist: PoseLandmarkPoint | undefined,
): SideState {
  const hits = pushHit(state.hits, candidateValid)
  const hitCount = hits.filter(Boolean).length
  const shouldActivate = hitCount >= REQUIRED_HITS

  if (candidateValid && wrist) {
    return {
      active: state.active || shouldActivate,
      missesRemaining: MISSING_GRACE_FRAMES,
      hits,
      lastAcceptedWrist: { x: wrist.x, y: wrist.y },
    }
  }

  if (wristVisible) {
    return {
      active: false,
      missesRemaining: 0,
      hits,
      lastAcceptedWrist: null,
    }
  }

  if (state.active) {
    const missesRemaining = state.missesRemaining - 1
    return {
      ...state,
      active: missesRemaining >= 0,
      missesRemaining,
      hits,
    }
  }

  return {
    ...state,
    active: shouldActivate,
    hits,
  }
}

function pushHit(hits: boolean[], value: boolean): boolean[] {
  const next = [...hits, value]
  while (next.length > WINDOW_SIZE) next.shift()
  return next
}

function isCandidateValid(
  landmarks: PoseLandmarkPoint[],
  side: HandSide,
  shoulderWidth: number,
  lastAcceptedWrist: Point | null,
): boolean {
  const shoulder = landmarks[side === 'left' ? LEFT_SHOULDER : RIGHT_SHOULDER]
  const elbow = landmarks[side === 'left' ? LEFT_ELBOW : RIGHT_ELBOW]
  const wrist = landmarks[side === 'left' ? LEFT_WRIST : RIGHT_WRIST]

  if (!isBodyVisible(shoulder) || !isBodyVisible(elbow) || !isHandVisible(wrist)) {
    return false
  }

  const forearm = distance(elbow, wrist) / shoulderWidth
  const armReach = distance(shoulder, wrist) / shoulderWidth
  const upperArm = distance(shoulder, elbow) / shoulderWidth

  if (forearm < 0.25 || forearm > 1.75) return false
  if (upperArm < 0.20 || upperArm > 1.65) return false
  if (armReach < 0.35 || armReach > 2.80) return false

  if (lastAcceptedWrist) {
    const jump = distance(lastAcceptedWrist, wrist) / shoulderWidth
    if (jump > MAX_WRIST_JUMP_IN_SHOULDERS) return false
  }

  return true
}

function hasShoulderPair(landmarks: PoseLandmarkPoint[]): boolean {
  return isBodyVisible(landmarks[LEFT_SHOULDER]) && isBodyVisible(landmarks[RIGHT_SHOULDER])
}

function isBodyVisible(point?: PoseLandmarkPoint): point is PoseLandmarkPoint {
  if (!point) return false
  return point.visibility == null || point.visibility >= BODY_VISIBILITY_THRESHOLD
}

function isHandVisible(point?: PoseLandmarkPoint): point is PoseLandmarkPoint {
  if (!point) return false
  return point.visibility == null || point.visibility >= HAND_VISIBILITY_THRESHOLD
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
