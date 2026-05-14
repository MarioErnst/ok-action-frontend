import { apiRequest } from '../../../../api/client';
import type {
  AccentuationPhraseDto,
  AccentuationPhraseEvaluationOutputDto,
  AccentuationSessionDto,
  AccentuationSessionListItemDto,
  AccentuationWeakestPromptDto,
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

  return apiRequest<PhraseEvaluationDto, FormData>('/accentuation/evaluate', {
    method: 'POST',
    body: formData,
  });
}

export const HttpAccentuationRepository = {
  evaluatePhrase,

  async listPhrases(): Promise<AccentuationPhraseDto[]> {
    return apiRequest<AccentuationPhraseDto[]>('/accentuation/phrases');
  },

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

  async getSessionPhrases(
    sessionId: string,
  ): Promise<AccentuationPhraseEvaluationOutputDto[]> {
    return apiRequest<AccentuationPhraseEvaluationOutputDto[]>(
      `/accentuation/sessions/${sessionId}/phrases`,
    );
  },

  async getWeakestPrompts(
    limit = 5,
    minPracticeCount = 1,
  ): Promise<AccentuationWeakestPromptDto[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      min_practice_count: String(minPracticeCount),
    });
    return apiRequest<AccentuationWeakestPromptDto[]>(
      `/accentuation/insights/weakest-prompts?${params.toString()}`,
    );
  },
};
