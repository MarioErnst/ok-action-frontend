import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { HandPresenceResult } from './handPresenceFilter'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const FULL_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
const LITE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const FRAME_INTERVAL_MS = 1000 / 18

export type PoseLandmarkPoint = NormalizedLandmark

export type PoseDetectionFrame = {
  landmarks: PoseLandmarkPoint[]
  timestampMs: number
  handPresence?: HandPresenceResult
}

export type PoseFrameCallback = (frame: PoseDetectionFrame) => void

export class PoseDetectionService {
  private landmarker: PoseLandmarker | null = null
  private stream: MediaStream | null = null
  private animFrameId: number | null = null
  private lastFrameTime = 0
  private currentVideo: HTMLVideoElement | null = null

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL)
    let lastError: unknown = null

    for (const modelAssetPath of [FULL_MODEL_URL, LITE_MODEL_URL]) {
      try {
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        })
        return
      } catch (err) {
        lastError = err
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Pose Landmarker failed to load')
  }

  async startCamera(videoEl: HTMLVideoElement): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    this.stream = stream

    try {
      videoEl.srcObject = stream
      await videoEl.play()
      this.currentVideo = videoEl
    } catch (err) {
      stream.getTracks().forEach((track) => track.stop())
      this.stream = null
      throw err
    }
  }

  isDetecting(): boolean {
    return this.animFrameId !== null
  }

  async attachStream(videoEl: HTMLVideoElement): Promise<void> {
    if (!this.stream) return
    if (videoEl.srcObject !== this.stream) {
      videoEl.srcObject = this.stream
      try {
        await videoEl.play()
      } catch {
        // The next user gesture or visibility change can resume playback.
      }
    }
    this.currentVideo = videoEl
  }

  startDetection(onFrame: PoseFrameCallback): void {
    if (!this.landmarker) throw new Error('Model not loaded')

    const detect = (now: number) => {
      this.animFrameId = requestAnimationFrame(detect)
      if (now - this.lastFrameTime < FRAME_INTERVAL_MS) return
      this.lastFrameTime = now

      const videoEl = this.currentVideo
      if (!videoEl || videoEl.readyState < 2) return

      const result = this.landmarker!.detectForVideo(videoEl, now)
      const landmarks = result.landmarks?.[0]
      if (!landmarks?.length) return

      onFrame({ landmarks, timestampMs: Date.now() })
    }

    this.animFrameId = requestAnimationFrame(detect)
  }

  stopDetection(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  stopCamera(): void {
    this.stopDetection()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.currentVideo = null
  }

  dispose(): void {
    this.stopCamera()
    this.landmarker?.close()
    this.landmarker = null
  }
}
