import type { PoseLandmarkPoint } from './poseDetectionService'
import type { HandPresenceResult } from './handPresenceFilter'

const CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]

const BODY_RENDER_THRESHOLD = 0.35
const HAND_RENDER_THRESHOLD = 0.45
const HAND_LANDMARKS = new Set([15, 16])

export function drawPoseLandmarks(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: PoseLandmarkPoint[],
  handPresence?: HandPresenceResult,
): void {
  const rect = video.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
  ctx.lineWidth = 3 * dpr

  for (const [a, b] of CONNECTIONS) {
    const pa = landmarks[a]
    const pb = landmarks[b]
    if (!isVisible(a, pa, handPresence) || !isVisible(b, pb, handPresence)) continue
    ctx.beginPath()
    ctx.moveTo(pa.x * width, pa.y * height)
    ctx.lineTo(pb.x * width, pb.y * height)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(245, 158, 11, 0.95)'
  for (const [index, point] of landmarks.entries()) {
    if (!isVisible(index, point, handPresence)) continue
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, 3.5 * dpr, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function clearPoseCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx?.clearRect(0, 0, canvas.width, canvas.height)
}

function isVisible(
  index: number,
  point?: PoseLandmarkPoint,
  handPresence?: HandPresenceResult,
): point is PoseLandmarkPoint {
  if (!point) return false
  if (index === 15 && handPresence && !handPresence.left) return false
  if (index === 16 && handPresence && !handPresence.right) return false
  const threshold = HAND_LANDMARKS.has(index) ? HAND_RENDER_THRESHOLD : BODY_RENDER_THRESHOLD
  return point.visibility == null || point.visibility >= threshold
}
