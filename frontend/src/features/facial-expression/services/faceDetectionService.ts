import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision'

// MediaPipe WASM and model are loaded from CDN to avoid bundling the binary.
// The face_landmarker.task model (~3.7MB) is the only public version of this
// task — there is no "lite" variant; the model is already small enough for mobile.
// WASM version must stay in sync with the @mediapipe/tasks-vision entry in package.json.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// Detection is capped at 15fps to avoid overloading mobile hardware.
const FRAME_INTERVAL_MS = 1000 / 15

export type BlendshapeCategory = { categoryName: string; score: number }
export type LandmarkPoint = NormalizedLandmark

export type DetectionFrame = {
  blendshapes: BlendshapeCategory[]
  landmarks: LandmarkPoint[]
}

export type FrameCallback = (frame: DetectionFrame) => void

export class FaceDetectionService {
  private landmarker: FaceLandmarker | null = null
  private stream: MediaStream | null = null
  private animFrameId: number | null = null
  private lastFrameTime = 0
  // The currently-mounted video element. Read fresh on every detection tick so
  // a view transition that swaps in a new <video> doesn't strand the loop on
  // the old (unmounted) element.
  private currentVideo: HTMLVideoElement | null = null

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL)
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      outputFaceBlendshapes: true,
      // outputFacialTransformationMatrixes is intentionally omitted — we don't
      // need head pose, just landmarks for the wireframe overlay.
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
      this.currentVideo = videoEl
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

  getStream(): MediaStream | null {
    return this.stream
  }

  /**
   * Wire the active camera stream to a (possibly new) video element and mark
   * it as the current video for the detection loop. Called when the React
   * view layer remounts the <video> mid-session — for example when switching
   * from calibration to live — so both the stream and the loop follow the DOM.
   */
  async attachStream(videoEl: HTMLVideoElement): Promise<void> {
    if (!this.stream) return
    if (videoEl.srcObject !== this.stream) {
      videoEl.srcObject = this.stream
      try {
        await videoEl.play()
      } catch {
        // play() can reject on hidden tabs or blocked autoplay; the stream is
        // still attached and will play once the element becomes visible.
      }
    }
    // Update the active video unconditionally — the previous element may have
    // been unmounted even if its srcObject is still pointing at our stream.
    this.currentVideo = videoEl
  }

  startDetection(onFrame: FrameCallback): void {
    if (!this.landmarker) throw new Error('Model not loaded')

    const detect = (now: number) => {
      this.animFrameId = requestAnimationFrame(detect)

      if (now - this.lastFrameTime < FRAME_INTERVAL_MS) return
      this.lastFrameTime = now

      // Read the active video on every tick, not from the closure: the
      // element may have been swapped by attachStream after a view transition.
      const videoEl = this.currentVideo
      if (!videoEl || videoEl.readyState < 2) return

      const result = this.landmarker!.detectForVideo(videoEl, now)
      if (!result.faceBlendshapes?.length || !result.faceLandmarks?.length) return

      onFrame({
        blendshapes: result.faceBlendshapes[0].categories,
        landmarks: result.faceLandmarks[0],
      })
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
    this.currentVideo = null
  }

  dispose(): void {
    this.stopCamera()
    this.landmarker?.close()
    this.landmarker = null
  }
}
