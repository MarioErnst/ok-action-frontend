import { apiRequest } from '../../../../api/client'
import type {
  PhraseEvaluationDto,
  PronunciationSessionDto,
  PronunciationSessionListItemDto,
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
