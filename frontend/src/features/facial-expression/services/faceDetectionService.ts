import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import type { LiveBlendshapes } from '../domain/FacialExpression'

// MediaPipe WASM and model are loaded from CDN to avoid bundling the binary.
// The lite model (~5MB) is used for mobile performance (vs ~30MB full model).
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker_lite/float16/1/face_landmarker_lite.task'

// Detection is capped at 15fps to avoid overloading mobile hardware.
const FRAME_INTERVAL_MS = 1000 / 15

export type BlendshapeCallback = (blendshapes: LiveBlendshapes) => void

export class FaceDetectionService {
  private landmarker: FaceLandmarker | null = null
  private stream: MediaStream | null = null
  private animFrameId: number | null = null
  private lastFrameTime = 0

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL)
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    })
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
    } catch (err) {
      // play() can fail on iOS if the element is detached or autoplay is blocked.
      // Tear the stream down to avoid leaking the camera indicator.
      stream.getTracks().forEach((t) => t.stop())
      this.stream = null
      throw err
    }
  }

  isDetecting(): boolean {
    return this.animFrameId !== null
  }

  startDetection(videoEl: HTMLVideoElement, onFrame: BlendshapeCallback): void {
    if (!this.landmarker) throw new Error('Model not loaded')

    const detect = (now: number) => {
      this.animFrameId = requestAnimationFrame(detect)

      if (now - this.lastFrameTime < FRAME_INTERVAL_MS) return
      this.lastFrameTime = now

      if (videoEl.readyState < 2) return

      const result = this.landmarker!.detectForVideo(videoEl, now)
      if (!result.faceBlendshapes?.length) return

      const shapes = result.faceBlendshapes[0].categories
      const get = (name: string) =>
        shapes.find((b) => b.categoryName === name)?.score ?? 0

      const blendshapes: LiveBlendshapes = {
        pucker: get('mouthPucker'),
        brow_down: (get('browDownLeft') + get('browDownRight')) / 2,
        lips_down: (get('mouthFrownLeft') + get('mouthFrownRight')) / 2,
      }

      onFrame(blendshapes)
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
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  dispose(): void {
    this.stopCamera()
    this.landmarker?.close()
    this.landmarker = null
  }
}
