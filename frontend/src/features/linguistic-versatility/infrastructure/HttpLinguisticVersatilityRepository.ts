import type {
  EvaluateRoundResponse,
  SessionDetail,
  SessionListItem,
  StartSessionResponse,
} from '../domain/LinguisticVersatility'

// Audio uploads can take longer than text endpoints (network + Gemini
// inference). 60s is enough for a slow connection but caps a hung request
// before the user sees an indefinite spinner.
const AUDIO_REQUEST_TIMEOUT_MS = 60_000

const API_BASE_URL =
  (globalThis as { __APP_API_URL__?: string }).__APP_API_URL__ ??
  import.meta.env.VITE_API_URL ??
  '/api'

const PREFIX = '/linguistic-versatility'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function uploadAudio<T>(
  path: string,
  audio: Blob,
  fields: Record<string, string> = {},
): Promise<T> {
  const form = new FormData()
  // Filename must have an extension Gemini understands; use the blob's MIME
  // type to derive it so iOS (mp4) and other browsers (webm) both work.
  const ext = audio.type.includes('mp4') ? 'mp4' : 'webm'
  form.append('audio', audio, `answer.${ext}`)
  for (const [k, v] of Object.entries(fields)) form.append(k, v)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AUDIO_REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al enviar el audio.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const HttpLinguisticVersatilityRepository = {
  async startSession(): Promise<StartSessionResponse> {
    return jsonRequest<StartSessionResponse>(`${PREFIX}/sessions`, {
      method: 'POST',
    })
  },

  async submitRound(
    sessionId: string,
    questionId: string,
    audio: Blob,
  ): Promise<EvaluateRoundResponse> {
    return uploadAudio<EvaluateRoundResponse>(
      `${PREFIX}/sessions/${sessionId}/rounds`,
      audio,
      { question_id: questionId },
    )
  },

  async finalize(sessionId: string): Promise<SessionDetail> {
    return jsonRequest<SessionDetail>(
      `${PREFIX}/sessions/${sessionId}/finalize`,
      { method: 'POST' },
    )
  },

  async abandon(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}${PREFIX}/sessions/${sessionId}/abandon`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    if (!res.ok && res.status !== 204) {
      // 404 is intentionally swallowed: abandon is fire-and-forget on nav-away.
      throw new Error(`HTTP ${res.status}`)
    }
  },

  async getSession(sessionId: string): Promise<SessionDetail> {
    return jsonRequest<SessionDetail>(`${PREFIX}/sessions/${sessionId}`, {
      method: 'GET',
    })
  },

  async getHistory(): Promise<SessionListItem[]> {
    return jsonRequest<SessionListItem[]>(`${PREFIX}/history`, { method: 'GET' })
  },
}
