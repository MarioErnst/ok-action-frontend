import { apiRequest, ApiError } from '../../../../api/client'
import type {
  PhrasePronunciationDto,
  PronunciationSessionDto,
  PronunciationSessionListItemDto,
  SavePronunciationSessionDto,
} from '../dto/PronunciationDtos'

const API_BASE_URL =
  (globalThis as { __APP_API_URL__?: string }).__APP_API_URL__ ??
  import.meta.env.VITE_API_URL ??
  '/api'

async function evaluatePhrase(
  audioBlob: Blob,
  phraseText: string,
  phraseIndex: number,
  level: string,
): Promise<PhrasePronunciationDto> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('phrase_text', phraseText)
  formData.append('phrase_index', String(phraseIndex))
  formData.append('level', level)

  const token = localStorage.getItem('auth_token')
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  const response = await fetch(`${API_BASE_URL}/pronunciation/evaluate`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (response.status === 401) {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Record<string, unknown>
    throw new ApiError(
      response.status,
      String(errorPayload.code ?? 'unknown_error'),
      String(errorPayload.message ?? 'Error al evaluar el audio'),
      errorPayload.details,
    )
  }

  return payload as PhrasePronunciationDto
}

export const HttpPronunciationRepository = {
  evaluatePhrase,

  async saveSession(data: SavePronunciationSessionDto): Promise<PronunciationSessionDto> {
    return apiRequest<PronunciationSessionDto, SavePronunciationSessionDto>(
      '/pronunciation/sessions',
      { method: 'POST', body: data },
    )
  },

  async listSessions(): Promise<PronunciationSessionListItemDto[]> {
    return apiRequest<PronunciationSessionListItemDto[]>('/pronunciation/sessions')
  },

  async getSession(sessionId: string): Promise<PronunciationSessionDto> {
    return apiRequest<PronunciationSessionDto>(`/pronunciation/sessions/${sessionId}`)
  },
}
