// Thin WebSocket client for the Gemini Live streaming evaluator.
//
// Mirrors fluency/consistency conventions: one WS per active session,
// JSON for control frames, binary frames for audio. The token query
// param holds the JWT because browser WebSocket does not allow custom
// headers. apiRequest reads the same token from localStorage; we do
// not duplicate the storage policy here.
//
// The socket is intentionally dumb. It exposes:
//   - open(): handshake and resolves when the server says ready
//   - sendAudio(pcm): post a binary frame
//   - close(): graceful close, sends {type:"end"} before closing
//   - onStrike(handler): receive strike events
//   - onClose(handler): notified when the server closes the WS
// The hook on top decides what to do with strikes; the socket never
// touches counters or app state directly.

import { WS_BASE_URL } from '../../../../api/client'
import type {
  LiveStreamModule,
  StrikeMessageDto,
} from '../../infrastructure/dto/LiveStreamDtos'


export type StrikeHandler = (event: StrikeMessageDto) => void
export type CloseHandler = (info: { code: number; reason: string }) => void

interface OpenOptions {
  sessionId: string
  modules: LiveStreamModule[]
  token: string
  // 10 s aligns with the backend timeout on the start message.
  // Exposed for tests.
  readyTimeoutMs?: number
}


export class LiveStreamSocket {
  private ws: WebSocket | null = null
  private strikeHandler: StrikeHandler | null = null
  private closeHandler: CloseHandler | null = null
  private endSent = false
  // Profile timestamps so the dev console can show end-to-end latency
  // without external instrumentation. Stay as console.debug so the
  // production console (info+) stays clean.
  private openStartedAt = 0
  private firstChunkSentAt = 0
  private firstStrikeAt = 0

  onStrike(handler: StrikeHandler): void {
    this.strikeHandler = handler
  }

  onClose(handler: CloseHandler): void {
    this.closeHandler = handler
  }

  open(options: OpenOptions): Promise<void> {
    if (this.ws) {
      return Promise.reject(new Error('LiveStreamSocket already open'))
    }

    const url = `${WS_BASE_URL}/live/sessions/${options.sessionId}/stream?token=${encodeURIComponent(options.token)}`
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    this.ws = ws
    this.endSent = false
    this.openStartedAt = performance.now()
    this.firstChunkSentAt = 0
    this.firstStrikeAt = 0
    console.debug('[live-stream] socket.open started')

    return new Promise<void>((resolve, reject) => {
      const timeoutHandle = window.setTimeout(() => {
        reject(new Error('Timed out waiting for ready'))
        try {
          ws.close()
        } catch {
          // ignore
        }
      }, options.readyTimeoutMs ?? 10_000)

      let readyReceived = false

      ws.onopen = () => {
        // Backend expects {type:"start", modules:[...]} within 10 s.
        ws.send(
          JSON.stringify({
            type: 'start',
            modules: options.modules,
          }),
        )
      }

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          // Server should never push binary; ignore defensively.
          return
        }
        let parsed: { type?: string } & Record<string, unknown>
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }

        if (parsed.type === 'ready') {
          readyReceived = true
          window.clearTimeout(timeoutHandle)
          console.debug(
            '[live-stream] ready received',
            Math.round(performance.now() - this.openStartedAt),
            'ms after open',
          )
          resolve()
          return
        }

        if (parsed.type === 'strike') {
          if (this.firstStrikeAt === 0) {
            this.firstStrikeAt = performance.now()
            console.debug(
              '[live-stream] first strike received',
              this.firstChunkSentAt > 0
                ? Math.round(this.firstStrikeAt - this.firstChunkSentAt)
                : '?',
              'ms after first chunk',
            )
          }
          this.strikeHandler?.(parsed as unknown as StrikeMessageDto)
          return
        }

        if (parsed.type === 'session_ended' || parsed.type === 'error') {
          // The server is about to close. We let onclose handle the
          // teardown notification so handlers see a single close
          // signal regardless of which side initiated.
          return
        }
      }

      ws.onerror = () => {
        // The browser fires a generic error event without details;
        // the close event that follows carries the useful info.
      }

      ws.onclose = (event) => {
        window.clearTimeout(timeoutHandle)
        this.ws = null
        if (!readyReceived) {
          reject(new Error(event.reason || 'WebSocket closed before ready'))
          return
        }
        this.closeHandler?.({ code: event.code, reason: event.reason })
      }
    })
  }

  sendAudio(chunk: Uint8Array): void {
    const ws = this.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    // Some Safari builds insist on ArrayBuffer rather than typed array
    // views. We copy into a fresh ArrayBuffer to ensure it is never
    // backed by a SharedArrayBuffer (which WebSocket.send rejects in
    // strict TS configs).
    const copy = new ArrayBuffer(chunk.byteLength)
    new Uint8Array(copy).set(chunk)
    ws.send(copy)
    if (this.firstChunkSentAt === 0) {
      this.firstChunkSentAt = performance.now()
      console.debug('[live-stream] first audio chunk sent')
    }
  }

  async close(): Promise<void> {
    const ws = this.ws
    if (!ws) return
    if (ws.readyState === WebSocket.OPEN && !this.endSent) {
      try {
        ws.send(JSON.stringify({ type: 'end' }))
        this.endSent = true
      } catch {
        // ignore: we are going to close anyway
      }
    }
    try {
      ws.close()
    } catch {
      // already closed
    }
    this.ws = null
  }
}
