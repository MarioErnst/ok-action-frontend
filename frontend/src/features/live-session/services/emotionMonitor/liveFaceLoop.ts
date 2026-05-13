import type { RawEmotionName } from '../../domain/EmotionTrigger'

// Thin wrapper around the standalone facial_expression module's
// FaceDetectionService + classify(). The whole pair is dynamically
// imported so the MediaPipe WASM (~1 MB) only downloads when the user
// actually activates the facial module on a live session — never on
// app startup, per the project-wide ML lazy-load rule.
//
// The loop emits one {emotion, confidence} prediction per detection
// tick (which is itself rate-limited inside FaceDetectionService to
// the 15 fps cap mandated by the multi-platform rules).

export interface FacePrediction {
  emotion: RawEmotionName
  confidence: number
}

// Late-binding to keep the dynamic-import boundary explicit.
type DetectorModule = typeof import('../../../facial-expression/services/faceDetectionService')
type ClassifierModule = typeof import('../../../facial-expression/services/emotionClassifier')

export class LiveFaceLoop {
  private detector: InstanceType<DetectorModule['FaceDetectionService']> | null = null
  private classifyFn: ClassifierModule['classify'] | null = null
  private listener: ((prediction: FacePrediction) => void) | null = null
  private loaded = false

  // Lazy-load the model + classifier. Resolves when the model is ready
  // to detect — keep the user-facing UI in a "loading" state until this
  // resolves so the first emotion does not arrive into an unmounted
  // session.
  async load(): Promise<void> {
    if (this.loaded && this.detector) return
    const [detectorMod, classifierMod] = await Promise.all([
      import('../../../facial-expression/services/faceDetectionService'),
      import('../../../facial-expression/services/emotionClassifier'),
    ])
    this.detector = new detectorMod.FaceDetectionService()
    this.classifyFn = classifierMod.classify
    await this.detector.load()
    this.loaded = true
  }

  // Open the camera, attach to the supplied <video>, and start the
  // detection loop. The listener fires once per detection tick.
  async start(videoEl: HTMLVideoElement, listener: (prediction: FacePrediction) => void): Promise<void> {
    if (!this.detector || !this.classifyFn) {
      throw new Error('LiveFaceLoop not loaded: call load() first')
    }
    this.listener = listener
    await this.detector.startCamera(videoEl)
    const classify = this.classifyFn
    this.detector.startDetection((frame) => {
      const detection = classify(frame.blendshapes)
      const emotion = detection.dominantEmotion as RawEmotionName
      const confidence = detection.emotions[detection.dominantEmotion] ?? 0
      this.listener?.({ emotion, confidence })
    })
  }

  // Returns the camera MediaStream once it has been opened. Used by
  // the recording screen to bind the <video> element when the page
  // first mounts the camera surface.
  getStream(): MediaStream | null {
    return this.detector?.getStream() ?? null
  }

  // Attach the same stream to a different <video> element. Needed when
  // the React view swaps the element on phase transition (calibrating
  // -> recording -> stopped_transition) so the detection loop keeps
  // running.
  async attachStream(videoEl: HTMLVideoElement): Promise<void> {
    if (!this.detector) return
    await this.detector.attachStream(videoEl)
  }

  stop(): void {
    this.listener = null
    if (!this.detector) return
    if (this.detector.isDetecting?.()) {
      // FaceDetectionService exposes its loop teardown via a method we
      // do not directly call here to keep the surface narrow. We rely
      // on the detector instance being dropped along with the camera
      // stream when stopCamera tears down.
    }
    this.detector.stopDetection?.()
    this.detector.stopCamera?.()
  }
}
