import type {
  BodyCalibration,
  BodyExpressionFeedback,
  BodyExpressionMetrics,
  BodyFramingMode,
  LiveBodyMetrics,
} from '../domain/BodyExpression'
import {
  HandPresenceFilter,
  createEmptyHandPresence,
  isFilteredHandVisible,
  type HandPresenceResult,
  type HandSide,
} from './handPresenceFilter'
import type { PoseDetectionFrame, PoseLandmarkPoint } from './poseDetectionService'

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_ELBOW = 13
const RIGHT_ELBOW = 14
const LEFT_WRIST = 15
const RIGHT_WRIST = 16
const LEFT_HIP = 23
const RIGHT_HIP = 24
const LEFT_KNEE = 25
const RIGHT_KNEE = 26
const LEFT_ANKLE = 27
const RIGHT_ANKLE = 28

const VISIBILITY_THRESHOLD = 0.42
const HAND_VISIBILITY_THRESHOLD = 0.50

type Point = { x: number; y: number }

type FrameScores = LiveBodyMetrics & {
  stabilityScore: number
  torsoCenter: Point
  activeGesture: boolean
}

export function buildBodyCalibration(frames: PoseDetectionFrame[]): BodyCalibration {
  const valid = frames.filter((frame) => hasUpperBody(frame.landmarks))
  if (valid.length === 0) {
    return {
      shoulderWidth: 0.25,
      torsoHeight: 0.35,
      centerX: 0.5,
      centerY: 0.45,
      qualityPct: 0,
      framingMode: 'mixed',
    }
  }

  const shoulderWidths = valid.map((frame) => shoulderWidth(frame.landmarks)).filter((v) => v > 0)
  const torsoHeights = valid.map((frame) => torsoHeight(frame.landmarks)).filter((v) => v > 0)
  const centers = valid.map((frame) => torsoCenter(frame.landmarks))
  const centerDrift = averageDistanceFromMean(centers)

  const trackedPct = pct(valid.length, frames.length)
  const steadinessPct = clamp(100 - centerDrift * 800)
  const visibilityPct = average(valid.map((frame) => landmarkVisibilityScore(frame.landmarks)))
  const qualityPct = round(clamp(trackedPct * 0.45 + steadinessPct * 0.25 + visibilityPct * 0.30))

  return {
    shoulderWidth: average(shoulderWidths) || 0.25,
    torsoHeight: average(torsoHeights) || 0.35,
    centerX: average(centers.map((p) => p.x)) || 0.5,
    centerY: average(centers.map((p) => p.y)) || 0.45,
    qualityPct,
    framingMode: dominantFramingMode(valid.map((frame) => detectFramingMode(frame.landmarks))),
  }
}

export function summarizeBodyExpression(
  frames: PoseDetectionFrame[],
  calibration: BodyCalibration,
): BodyExpressionMetrics {
  if (frames.length === 0) return emptyMetrics(calibration)

  let previous: PoseDetectionFrame | null = null
  const scored: FrameScores[] = []
  const handFilter = new HandPresenceFilter()

  for (const frame of frames) {
    const enrichedFrame = ensureHandPresence(frame, handFilter)
    const scores = scoreFrame(enrichedFrame, calibration, previous)
    if (scores.poseVisible) scored.push(scores)
    previous = enrichedFrame
  }

  if (scored.length === 0) return emptyMetrics(calibration)

  const trackedPct = round(pct(scored.length, frames.length))
  const handsVisiblePct = round(pct(scored.filter((frame) => frame.handsVisible).length, scored.length))
  const activeGesturePct = pct(scored.filter((frame) => frame.activeGesture).length, scored.length)
  const excessiveMovementPct = round(
    pct(scored.filter((frame) => frame.excessiveMovement).length, scored.length),
  )
  const centerDriftPenalty = clamp(averageDistanceFromMean(scored.map((frame) => frame.torsoCenter)) * 450)
  const stabilityScore = round(
    clamp(
      average(scored.map((frame) => frame.stabilityScore)) -
        excessiveMovementPct * 0.55 -
        centerDriftPenalty,
    ),
  )
  const gestureScore = round(scoreIdealBand(activeGesturePct, 20, 65))
  const energyScore = round(
    clamp(scoreIdealBand(activeGesturePct, 18, 72) * 0.70 + handsVisiblePct * 0.20 + stabilityScore * 0.10),
  )

  return {
    postureScore: round(average(scored.map((frame) => frame.postureScore))),
    opennessScore: round(average(scored.map((frame) => frame.opennessScore))),
    gestureScore,
    stabilityScore,
    energyScore,
    framingScore: round(average(scored.map((frame) => frame.framingScore))),
    trackedPct,
    handsVisiblePct,
    excessiveMovementPct,
    calibrationQualityPct: calibration.qualityPct,
    framingMode: dominantFramingMode(scored.map((frame) => frame.framingMode)),
  }
}

export function scoreLiveFrame(
  frame: PoseDetectionFrame,
  calibration: BodyCalibration,
  previous: PoseDetectionFrame | null,
): LiveBodyMetrics {
  return scoreFrame(frame, calibration, previous)
}

export function deriveOverallScore(metrics: BodyExpressionMetrics): number {
  return round(
    clamp(
      metrics.postureScore * 0.20 +
        metrics.opennessScore * 0.20 +
        metrics.gestureScore * 0.20 +
        metrics.stabilityScore * 0.15 +
        metrics.energyScore * 0.15 +
        metrics.framingScore * 0.10,
    ),
  )
}

export function buildInvalidFeedback(reason: string): BodyExpressionFeedback {
  return {
    summary: reason,
    strengths: [],
    improvements: [
      'Ajusta la camara antes de iniciar.',
      'Mantente visible y habla al menos 20 segundos.',
    ],
    recommendation: 'Repite la practica con hombros y manos dentro del encuadre.',
    source: 'rules',
  }
}

function scoreFrame(
  frame: PoseDetectionFrame,
  calibration: BodyCalibration,
  previous: PoseDetectionFrame | null,
): FrameScores {
  const landmarks = frame.landmarks
  if (!hasUpperBody(landmarks)) {
    return {
      postureScore: 0,
      opennessScore: 0,
      framingScore: 0,
      handsVisible: false,
      poseVisible: false,
      excessiveMovement: false,
      framingMode: 'mixed',
      stabilityScore: 0,
      torsoCenter: { x: 0.5, y: 0.5 },
      activeGesture: false,
    }
  }

  const center = torsoCenter(landmarks)
  const sw = Math.max(shoulderWidth(landmarks), calibration.shoulderWidth, 0.15)
  const mode = detectFramingMode(landmarks)
  const handPresence = frame.handPresence ?? createEmptyHandPresence()
  const handsVisible = hasVisibleHand(handPresence)

  const postureScore = scorePosture(landmarks, sw)
  const opennessScore = scoreOpenness(landmarks, sw, handPresence)
  const framingScore = scoreFraming(landmarks, mode, handPresence)

  const movement = previous && hasUpperBody(previous.landmarks)
    ? normalizedMovement(frame, previous, sw)
    : 0
  const activeGesture = movement > 0.020 && handsVisible
  const excessiveMovement = movement > 0.085 || Math.abs(center.x - calibration.centerX) > 0.28
  const stabilityScore = clamp(100 - movement * 600)

  return {
    postureScore,
    opennessScore,
    framingScore,
    handsVisible,
    poseVisible: true,
    excessiveMovement,
    framingMode: mode,
    stabilityScore,
    torsoCenter: center,
    activeGesture,
  }
}

function scorePosture(landmarks: PoseLandmarkPoint[], sw: number): number {
  const leftShoulder = landmarks[LEFT_SHOULDER]
  const rightShoulder = landmarks[RIGHT_SHOULDER]
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / sw
  const shoulderScore = clamp(100 - shoulderTilt * 260)

  if (!isVisible(landmarks[LEFT_HIP]) || !isVisible(landmarks[RIGHT_HIP])) {
    return round(shoulderScore)
  }

  const shoulderCenter = midpoint(leftShoulder, rightShoulder)
  const hipCenter = midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP])
  const lean = Math.abs(shoulderCenter.x - hipCenter.x) / sw
  const leanScore = clamp(100 - lean * 260)

  return round(shoulderScore * 0.55 + leanScore * 0.45)
}

function scoreOpenness(
  landmarks: PoseLandmarkPoint[],
  sw: number,
  handPresence: HandPresenceResult,
): number {
  const center = shoulderCenter(landmarks)
  const wrists = visibleWrists(landmarks, handPresence)
  const elbows = [landmarks[LEFT_ELBOW], landmarks[RIGHT_ELBOW]].filter(isVisible)

  if (wrists.length === 0) return 52

  const crossed =
    isFilteredHandVisible(handPresence, 'left') &&
    isFilteredHandVisible(handPresence, 'right') &&
    isHandVisible(landmarks[LEFT_WRIST]) &&
    isHandVisible(landmarks[RIGHT_WRIST]) &&
    landmarks[LEFT_WRIST].x > center.x &&
    landmarks[RIGHT_WRIST].x < center.x
  if (crossed) return 30

  const wristSpread = wrists.length >= 2 ? Math.abs(wrists[0].x - wrists[1].x) / sw : 0.65
  const elbowsOpen = elbows.length >= 2 ? Math.abs(elbows[0].x - elbows[1].x) / sw : wristSpread
  const openness = clamp((wristSpread * 45 + elbowsOpen * 35) - 10)

  return round(Math.max(45, Math.min(100, openness)))
}

function scoreFraming(
  landmarks: PoseLandmarkPoint[],
  mode: BodyFramingMode,
  handPresence: HandPresenceResult,
): number {
  const center = torsoCenter(landmarks)
  const horizontal = clamp(100 - Math.abs(center.x - 0.5) * 260)
  const shoulder = shoulderWidth(landmarks)
  const scaleIdeal = mode === 'full_body' ? 0.20 : 0.34
  const scale = clamp(100 - Math.abs(shoulder - scaleIdeal) * 220)
  const hands = hasVisibleHand(handPresence) ? 100 : 55
  return round(horizontal * 0.45 + scale * 0.35 + hands * 0.20)
}

function normalizedMovement(current: PoseDetectionFrame, previous: PoseDetectionFrame, sw: number): number {
  const indexes = [LEFT_WRIST, RIGHT_WRIST, LEFT_ELBOW, RIGHT_ELBOW, LEFT_SHOULDER, RIGHT_SHOULDER]
  const distances: number[] = []
  for (const index of indexes) {
    if (
      isReliableForMovement(index, current.landmarks[index], current.handPresence) &&
      isReliableForMovement(index, previous.landmarks[index], previous.handPresence)
    ) {
      distances.push(distance(current.landmarks[index], previous.landmarks[index]) / sw)
    }
  }
  return average(distances)
}

function detectFramingMode(landmarks: PoseLandmarkPoint[]): BodyFramingMode {
  const shoulders = isVisible(landmarks[LEFT_SHOULDER]) && isVisible(landmarks[RIGHT_SHOULDER])
  const hips = isVisible(landmarks[LEFT_HIP]) && isVisible(landmarks[RIGHT_HIP])
  const knees = isVisible(landmarks[LEFT_KNEE]) || isVisible(landmarks[RIGHT_KNEE])
  const ankles = isVisible(landmarks[LEFT_ANKLE]) || isVisible(landmarks[RIGHT_ANKLE])
  if (shoulders && hips && knees && ankles) return 'full_body'
  if (shoulders && (hips || hasVisibleRawHand(landmarks))) {
    return 'upper_body'
  }
  return 'mixed'
}

function hasUpperBody(landmarks: PoseLandmarkPoint[]): boolean {
  return isVisible(landmarks[LEFT_SHOULDER]) && isVisible(landmarks[RIGHT_SHOULDER])
}

function isVisible(point?: PoseLandmarkPoint): point is PoseLandmarkPoint {
  if (!point) return false
  return point.visibility == null || point.visibility >= VISIBILITY_THRESHOLD
}

function isHandVisible(point?: PoseLandmarkPoint): point is PoseLandmarkPoint {
  if (!point) return false
  return point.visibility == null || point.visibility >= HAND_VISIBILITY_THRESHOLD
}

function hasVisibleHand(handPresence: HandPresenceResult): boolean {
  return handPresence.left || handPresence.right
}

function isReliableForMovement(
  index: number,
  point?: PoseLandmarkPoint,
  handPresence?: HandPresenceResult,
): point is PoseLandmarkPoint {
  if (index === LEFT_WRIST || index === RIGHT_WRIST) {
    const side: HandSide = index === LEFT_WRIST ? 'left' : 'right'
    return isFilteredHandVisible(handPresence, side) && isHandVisible(point)
  }
  return isVisible(point)
}

function shoulderCenter(landmarks: PoseLandmarkPoint[]): Point {
  return midpoint(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER])
}

function torsoCenter(landmarks: PoseLandmarkPoint[]): Point {
  if (isVisible(landmarks[LEFT_HIP]) && isVisible(landmarks[RIGHT_HIP])) {
    return midpoint(shoulderCenter(landmarks), midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]))
  }
  return shoulderCenter(landmarks)
}

function shoulderWidth(landmarks: PoseLandmarkPoint[]): number {
  return distance(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER])
}

function torsoHeight(landmarks: PoseLandmarkPoint[]): number {
  if (!isVisible(landmarks[LEFT_HIP]) || !isVisible(landmarks[RIGHT_HIP])) return 0
  return distance(shoulderCenter(landmarks), midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]))
}

function landmarkVisibilityScore(landmarks: PoseLandmarkPoint[]): number {
  const indexes = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_ELBOW, RIGHT_ELBOW, LEFT_WRIST, RIGHT_WRIST, LEFT_HIP, RIGHT_HIP]
  return average(indexes.map((index) => {
    if (index === LEFT_WRIST || index === RIGHT_WRIST) {
      return isHandVisible(landmarks[index]) ? 100 : 0
    }
    return isVisible(landmarks[index]) ? 100 : 0
  }))
}

function visibleWrists(
  landmarks: PoseLandmarkPoint[],
  handPresence: HandPresenceResult,
): PoseLandmarkPoint[] {
  const wrists: PoseLandmarkPoint[] = []
  if (isFilteredHandVisible(handPresence, 'left') && isHandVisible(landmarks[LEFT_WRIST])) {
    wrists.push(landmarks[LEFT_WRIST])
  }
  if (isFilteredHandVisible(handPresence, 'right') && isHandVisible(landmarks[RIGHT_WRIST])) {
    wrists.push(landmarks[RIGHT_WRIST])
  }
  return wrists
}

function hasVisibleRawHand(landmarks: PoseLandmarkPoint[]): boolean {
  return isHandVisible(landmarks[LEFT_WRIST]) || isHandVisible(landmarks[RIGHT_WRIST])
}

function ensureHandPresence(
  frame: PoseDetectionFrame,
  filter: HandPresenceFilter,
): PoseDetectionFrame {
  if (frame.handPresence) return frame
  return {
    ...frame,
    handPresence: filter.update(frame.landmarks),
  }
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

function averageDistanceFromMean(points: Point[]): number {
  if (points.length === 0) return 0
  const mean = {
    x: average(points.map((point) => point.x)),
    y: average(points.map((point) => point.y)),
  }
  return average(points.map((point) => distance(point, mean)))
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function scoreIdealBand(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 100
  if (value < min) return clamp((value / min) * 100)
  return clamp(100 - (value - max) * 2.4)
}

function dominantFramingMode(values: BodyFramingMode[]): BodyFramingMode {
  const counts: Record<BodyFramingMode, number> = { upper_body: 0, full_body: 0, mixed: 0 }
  for (const value of values) counts[value] += 1
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'mixed') as BodyFramingMode
}

function emptyMetrics(calibration: BodyCalibration): BodyExpressionMetrics {
  return {
    postureScore: 0,
    opennessScore: 0,
    gestureScore: 0,
    stabilityScore: 0,
    energyScore: 0,
    framingScore: 0,
    trackedPct: 0,
    handsVisiblePct: 0,
    excessiveMovementPct: 0,
    calibrationQualityPct: calibration.qualityPct,
    framingMode: calibration.framingMode,
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function round(value: number): number {
  return Math.round(clamp(value))
}
