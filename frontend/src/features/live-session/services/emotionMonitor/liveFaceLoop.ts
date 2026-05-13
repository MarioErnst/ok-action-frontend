import type { RawEmotionName } from '../../domain/EmotionTrigger'

// Thin wrapper around the standalone facial_expression module's
// FaceDetectionService + classify(). The whole pair is dynamically
// imported so the MediaPipe WASM (~1 MB) only downloads when the user
// actually activates the facial module on a live session — never on
// app startup, per the project-wide ML lazy-load rule.
//
// LiveFaceLoop is self-contained: it owns an off-screen video element
// for the detection loop and exposes the underlying camera MediaStream
// via getStream() so the recording screen can mirror the live preview
// in a visible video element without opening a second camera.

export interface FacePrediction {
  emotion: RawEmotionName
  confidence: number
}

type DetectorModule = typeof import('../../../facial-expression/services/faceDetectionService')
type ClassifierModule = typeof import('../../../facial-expression/services/emotionClassifier')

export class LiveFaceLoop {
  private detector: InstanceType<DetectorModule['FaceDetectionService']> | null = null
  private classifyFn: ClassifierModule['classify'] | null = null
  private hiddenVideo: HTMLVideoElement | null = null
  private listener: ((prediction: FacePrediction) => void) | null = null
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

  // Open the camera into an internal off-screen video element and start
  // the detection loop. The listener fires once per detection tick.
  // After this resolves, getStream() returns the underlying MediaStream
  // so the visible UI can bind the same stream to its own <video>.
  async start(listener: (prediction: FacePrediction) => void): Promise<void> {
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

    const classify = this.classifyFn
    this.detector.startDetection((frame) => {
      const detection = classify(frame.blendshapes)
      const emotion = detection.dominantEmotion as RawEmotionName
      const confidence = detection.emotions[detection.dominantEmotion] ?? 0
      this.listener?.({ emotion, confidence })
    })
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
