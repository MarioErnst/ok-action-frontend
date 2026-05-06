import { ApiError } from '../../../api/client'
import type { EvaluateRoundDTO, FinalizeSessionDTO, PrecisionSessionDTO, StartSessionDTO } from './PrecisionSessionDTO'

// Mirrors the API_BASE_URL resolution used across all HTTP repositories in this project.
const API_BASE_URL =
  (globalThis as { __APP_API_URL__?: string }).__APP_API_URL__ ??
  import.meta.env.VITE_API_URL ??
  '/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Handles 401 the same way api/client.ts does: clear stored credentials and redirect.
async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (res.status === 401) {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
    throw new ApiError(401, 'unauthorized', 'Sesión expirada')
  }

  if (!res.ok) {
    const errorPayload = (payload ?? {}) as Record<string, unknown>
    throw new ApiError(
      res.status,
      String(errorPayload.code ?? 'unknown_error'),
      String(errorPayload.message ?? `HTTP ${res.status}`),
      errorPayload.details,
    )
  }

  if (res.status === 204) return undefined as T
  return payload as T
}

export class PrecisionRepository {
  static async startSession(totalRounds: number = 5): Promise<StartSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/precision/sessions?total_rounds=${totalRounds}`, {
      method: 'POST',
      headers: authHeaders(),
    })
    return handleResponse<StartSessionDTO>(res)
  }

  static async submitAnswer(
    sessionId: string,
    questionId: string,
    audioBlob: Blob,
    noiseLevel: 'low' | 'medium' | 'high',
    audioDurationSecs?: number,
  ): Promise<EvaluateRoundDTO> {
    const form = new FormData()
    form.append('audio', audioBlob, 'response.webm')
    form.append('question_id', questionId)
    form.append('noise_level', noiseLevel)
    if (audioDurationSecs !== undefined) {
      form.append('audio_duration_secs', String(audioDurationSecs))
    }

    const res = await fetch(`${API_BASE_URL}/precision/sessions/${sessionId}/rounds`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })
    return handleResponse<EvaluateRoundDTO>(res)
  }

  static async finalizeSession(sessionId: string): Promise<FinalizeSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/precision/sessions/${sessionId}/finalize`, {
      method: 'POST',
      headers: authHeaders(),
    })
    return handleResponse<FinalizeSessionDTO>(res)
  }

  static async abandonSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/precision/sessions/${sessionId}/abandon`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    await handleResponse<void>(res)
  }

  static async getSession(sessionId: string): Promise<PrecisionSessionDTO> {
    const res = await fetch(`${API_BASE_URL}/precision/sessions/${sessionId}`, {
      headers: authHeaders(),
    })
    return handleResponse<PrecisionSessionDTO>(res)
  }
}
