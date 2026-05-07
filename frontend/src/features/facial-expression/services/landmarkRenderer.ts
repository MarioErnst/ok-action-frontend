import { DrawingUtils, FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

export type FaceLandmarkPoint = NormalizedLandmark

// Soft white tessellation that reads well over both light and dark skin tones
// without dominating the camera image.
const TESSELLATION_STYLE = { color: 'rgba(255, 255, 255, 0.28)', lineWidth: 0.6 }

// Slightly stronger highlight on the eye/lip outlines so the user feels the
// model is "tracking them" instead of seeing a flat mesh.
const FEATURE_STYLE = { color: 'rgba(255, 255, 255, 0.55)', lineWidth: 1.1 }

export class LandmarkRenderer {
  private drawingUtils: DrawingUtils

  constructor(private ctx: CanvasRenderingContext2D) {
    this.drawingUtils = new DrawingUtils(ctx)
  }

  /**
   * Resize the backing canvas to match the rendered video size, accounting for
   * device pixel ratio so the wireframe stays crisp on high-DPI screens.
   */
  syncCanvasSize(canvas: HTMLCanvasElement, videoEl: HTMLVideoElement): void {
    const rect = videoEl.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const targetW = Math.max(1, Math.round(rect.width * dpr))
    const targetH = Math.max(1, Math.round(rect.height * dpr))
    if (canvas.width !== targetW) canvas.width = targetW
    if (canvas.height !== targetH) canvas.height = targetH
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }

  clear(canvas: HTMLCanvasElement): void {
    this.ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  draw(landmarks: FaceLandmarkPoint[]): void {
    // Tessellation = the full face mesh (~3000 small triangles).
    this.drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      TESSELLATION_STYLE,
    )
    // Reinforce the eyes and lips — the most expressive areas and the ones
    // users instinctively want to see traced.
    this.drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      FEATURE_STYLE,
    )
    this.drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      FEATURE_STYLE,
    )
    this.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, FEATURE_STYLE)
  }
}
