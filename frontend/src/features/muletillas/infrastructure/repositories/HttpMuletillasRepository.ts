import { apiRequest, ApiError, API_BASE_URL } from '../../../../api/client'
import type {
  MuletillasEvaluationDto,
  MuletillasSessionDto,
  MuletillasSessionListItemDto,
  RandomQuestionDto,
  SaveMuletillasSessionDto,
} from '../dto/MuletillasDtos'

async function evaluateResponse(
  audioBlob: Blob,
  questionText: string,
): Promise<MuletillasEvaluationDto> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('question_text', questionText)

  const token = localStorage.getItem('auth_token')
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  const response = await fetch(`${API_BASE_URL}/muletillas/evaluate`, {
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

  return payload as MuletillasEvaluationDto
}

export const HttpMuletillasRepository = {
  evaluateResponse,

  async getRandomQuestion(): Promise<RandomQuestionDto> {
    return apiRequest<RandomQuestionDto>('/muletillas/questions/random')
  },

  async saveSession(data: SaveMuletillasSessionDto): Promise<MuletillasSessionDto> {
    return apiRequest<MuletillasSessionDto, SaveMuletillasSessionDto>(
      '/muletillas/sessions',
      { method: 'POST', body: data },
    )
  },

  async listSessions(): Promise<MuletillasSessionListItemDto[]> {
    return apiRequest<MuletillasSessionListItemDto[]>('/muletillas/sessions')
  },

  async getSession(sessionId: string): Promise<MuletillasSessionDto> {
    return apiRequest<MuletillasSessionDto>(`/muletillas/sessions/${sessionId}`)
  },
}
