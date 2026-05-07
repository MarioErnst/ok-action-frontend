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
   * Match the canvas internal pixel grid to the video's intrinsic frame size.
   *
   * Why not use the rendered (CSS) size: MediaPipe landmark coordinates are
   * normalized to the source video frame (0..1 across `videoWidth × videoHeight`).
   * `DrawingUtils.drawConnectors` multiplies them by `canvas.width × canvas.height`,
   * so the canvas must use the video's bitmap dimensions for points to land on
   * the same pixels as the face. The canvas CSS box can still be any size —
   * the browser scales the canvas content to fit, and `object-fit: cover`
   * (set in CSS by the consumer) crops it identically to the video.
   */
  syncCanvasSize(canvas: HTMLCanvasElement, videoEl: HTMLVideoElement): void {
    const vw = videoEl.videoWidth
    const vh = videoEl.videoHeight
    if (!vw || !vh) return
    if (canvas.width !== vw) canvas.width = vw
    if (canvas.height !== vh) canvas.height = vh
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
