// MIME types tried in order. Browsers return false for `isTypeSupported` on
// types they cannot encode, so the first match wins.
//
// - iOS Safari only supports audio/mp4 (with various AAC codecs).
// - Chrome/Firefox prefer audio/webm with Opus.
// - audio/ogg is the desktop Firefox fallback.
//
// All listed MIME types are accepted by the backend's ALLOWED_MIME_TYPES
// allow-list and by Gemini's audio decoder.
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  for (const t of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  // Fallback: let the browser pick. Some Safari versions accept ''.
  return ''
}

/**
 * Thin wrapper around MediaRecorder that returns the recorded audio as a Blob.
 *
 * Why a class instead of a one-off function: stop() is async (we need the
 * dataavailable event), and consumers also want to know the recorder's state
 * (`isRecording`) and be able to cancel cleanly.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private mimeType: string = ''
  private stopResolver: ((blob: Blob) => void) | null = null
  private stopRejecter: ((err: unknown) => void) | null = null

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  async start(): Promise<void> {
    if (this.isRecording()) return

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    this.mimeType = pickSupportedMimeType()

    const options: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {}
    this.mediaRecorder = new MediaRecorder(this.stream, options)
    this.chunks = []

    this.mediaRecorder.addEventListener('dataavailable', (ev) => {
      if (ev.data && ev.data.size > 0) this.chunks.push(ev.data)
    })

    this.mediaRecorder.addEventListener('stop', () => {
      const finalType = this.mimeType || this.chunks[0]?.type || 'audio/webm'
      const blob = new Blob(this.chunks, { type: finalType })
      this.cleanup()
      this.stopResolver?.(blob)
      this.stopResolver = null
      this.stopRejecter = null
    })

    this.mediaRecorder.addEventListener('error', (ev) => {
      this.cleanup()
      this.stopRejecter?.(ev)
      this.stopResolver = null
      this.stopRejecter = null
    })

    this.mediaRecorder.start()
  }

  /**
   * Stops recording and resolves with the captured Blob. The blob's `type`
   * field is the MIME type the backend will see — caller can read it to
   * derive the filename/extension when uploading.
   */
  async stop(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      // Nothing to stop; return an empty blob so the caller doesn't crash.
      this.cleanup()
      return new Blob([], { type: this.mimeType || 'audio/webm' })
    }
    return new Promise<Blob>((resolve, reject) => {
      this.stopResolver = resolve
      this.stopRejecter = reject
      this.mediaRecorder!.stop()
    })
  }

  /** Cancel the recording and release the microphone without emitting a blob. */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      // Detach handlers so the in-flight stop event doesn't reject the next caller.
      this.stopResolver = null
      this.stopRejecter = null
      try {
        this.mediaRecorder.stop()
      } catch {
        // ignore — we're tearing down anyway
      }
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.mediaRecorder = null
    this.chunks = []
  }
}
