import { apiRequest, ApiError, API_BASE_URL } from '../../../../api/client';
import type {
  AccentuationSessionDto,
  AccentuationSessionListItemDto,
  PhraseEvaluationDto,
  SaveAccentuationSessionDto,
} from '../dto/AccentuationDtos';

async function evaluatePhrase(
  audioBlob: Blob,
  phraseText: string,
  phraseIndex: number,
): Promise<PhraseEvaluationDto> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('phrase_text', phraseText);
  formData.append('phrase_index', String(phraseIndex));

  const token = localStorage.getItem('auth_token');
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(`${API_BASE_URL}/accentuation/evaluate`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (response.status === 401) {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      String(errorPayload.code ?? 'unknown_error'),
      String(errorPayload.message ?? 'Error al evaluar el audio'),
      errorPayload.details,
    );
  }

  return payload as PhraseEvaluationDto;
}

export const HttpAccentuationRepository = {
  evaluatePhrase,

  async saveSession(data: SaveAccentuationSessionDto): Promise<AccentuationSessionDto> {
    return apiRequest<AccentuationSessionDto, SaveAccentuationSessionDto>(
      '/accentuation/sessions',
      { method: 'POST', body: data },
    );
  },

  async listSessions(): Promise<AccentuationSessionListItemDto[]> {
    return apiRequest<AccentuationSessionListItemDto[]>('/accentuation/sessions');
  },

  async getSession(sessionId: string): Promise<AccentuationSessionDto> {
    return apiRequest<AccentuationSessionDto>(`/accentuation/sessions/${sessionId}`);
  },
};
