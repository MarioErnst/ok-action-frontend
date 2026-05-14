import { apiRequest } from '../../../../api/client'
import type {
  PhraseEvaluationDto,
  PronunciationPhraseDto,
  PronunciationPhraseEvaluationOutputDto,
  PronunciationSessionDto,
  PronunciationSessionListItemDto,
  PronunciationWeakestPromptDto,
  SavePronunciationSessionDto,
} from '../dto/PronunciationDtos'

async function evaluatePhrase(
  audioBlob: Blob,
  phraseText: string,
  phraseIndex: number,
  level: string,
): Promise<PhraseEvaluationDto> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  formData.append('phrase_text', phraseText)
  formData.append('phrase_index', String(phraseIndex))
  formData.append('level', level)

  return apiRequest<PhraseEvaluationDto, FormData>('/pronunciation/evaluate', {
    method: 'POST',
    body: formData,
  })
}

export const HttpPronunciationRepository = {
  evaluatePhrase,

  async listPhrases(level: string): Promise<PronunciationPhraseDto[]> {
    return apiRequest<PronunciationPhraseDto[]>(
      `/pronunciation/phrases?level=${encodeURIComponent(level)}`,
    )
  },

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

  async getSessionPhrases(
    sessionId: string,
  ): Promise<PronunciationPhraseEvaluationOutputDto[]> {
    return apiRequest<PronunciationPhraseEvaluationOutputDto[]>(
      `/pronunciation/sessions/${sessionId}/phrases`,
    )
  },

  async getWeakestPrompts(
    limit = 5,
    minPracticeCount = 1,
    level?: string,
  ): Promise<PronunciationWeakestPromptDto[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      min_practice_count: String(minPracticeCount),
    })
    if (level) params.set('level', level)
    return apiRequest<PronunciationWeakestPromptDto[]>(
      `/pronunciation/insights/weakest-prompts?${params.toString()}`,
    )
  },
}
