import type { RawEmotionName } from '../../domain/EmotionTrigger'

// Thin wrapper around the standalone facial_expression module's
// FaceDetectionService + classify(). The pair is dynamically imported
// so the MediaPipe WASM (~1 MB) only downloads when the user actually
// activates the facial module on a live session — never on app
// startup, per the project-wide ML lazy-load rule.
//
// LiveFaceLoop is self-contained: it owns an off-screen video element
// for the detection loop and exposes the underlying camera MediaStream
// via getStream() so the recording screen can mirror the live preview
// in a visible video element without opening a second camera.
//
// The loop emits RAW blendshape categories per detection tick. The
// orchestrator decides whether to use those for baseline calibration
// (averaging) or for live classification (calling classify() with the
// pre-built baseline). Splitting the responsibility this way is what
// lets us calibrate the classifier against the user's neutral face
// during the silence window and only then start emitting predictions
// with sane confidence scores.

export interface BlendshapeSample {
  categoryName: string
  score: number
}

export interface FacePrediction {
  emotion: RawEmotionName
  confidence: number
}

export type BlendshapeBaseline = Record<string, number>

type DetectorModule = typeof import('../../../facial-expression/services/faceDetectionService')
type ClassifierModule = typeof import('../../../facial-expression/services/emotionClassifier')

export class LiveFaceLoop {
  private detector: InstanceType<DetectorModule['FaceDetectionService']> | null = null
  private classifyFn: ClassifierModule['classify'] | null = null
  private hiddenVideo: HTMLVideoElement | null = null
  private listener: ((blendshapes: BlendshapeSample[]) => void) | null = null
  private loaded = false

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

  // Open the camera into an internal off-screen video element and
  // start the detection loop. The listener fires once per detection
  // tick with the RAW blendshapes; the caller is responsible for
  // either accumulating them into a baseline or classifying them.
  async start(listener: (blendshapes: BlendshapeSample[]) => void): Promise<void> {
    if (!this.detector || !this.classifyFn) {
      throw new Error('LiveFaceLoop not loaded: call load() first')
    }
    this.listener = listener

    const hidden = document.createElement('video')
    hidden.autoplay = true
    hidden.muted = true
    // playsInline is mandatory on iOS Safari per the multi-platform rules,
    // otherwise the video forces full-screen and the detection loop sees
    // an unmounted element.
    hidden.setAttribute('playsinline', '')
    hidden.style.position = 'absolute'
    hidden.style.width = '1px'
    hidden.style.height = '1px'
    hidden.style.opacity = '0'
    hidden.style.pointerEvents = 'none'
    document.body.appendChild(hidden)
    this.hiddenVideo = hidden

    await this.detector.startCamera(hidden)

    this.detector.startDetection((frame) => {
      this.listener?.(frame.blendshapes)
    })
  }

  // Classify a set of blendshape samples with the standalone module's
  // classify(), optionally pre-subtracting a baseline so the emotion
  // scores reflect deltas above the user's neutral face. Returns the
  // dominant emotion and its confidence (the emotion score in 0..1).
  classify(
    blendshapes: BlendshapeSample[],
    baseline?: BlendshapeBaseline,
  ): FacePrediction {
    if (!this.classifyFn) {
      throw new Error('LiveFaceLoop not loaded: call load() first')
    }
    const detection = this.classifyFn(blendshapes, baseline)
    const emotion = detection.dominantEmotion as RawEmotionName
    const confidence = detection.emotions[detection.dominantEmotion] ?? 0
    return { emotion, confidence }
  }

  getStream(): MediaStream | null {
    return this.detector?.getStream() ?? null
  }

  stop(): void {
    this.listener = null
    this.detector?.stopDetection?.()
    this.detector?.stopCamera?.()
    if (this.hiddenVideo) {
      this.hiddenVideo.pause()
      this.hiddenVideo.srcObject = null
      this.hiddenVideo.remove()
      this.hiddenVideo = null
    }
  }
}
