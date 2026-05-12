import { apiRequest } from '../../../../api/client'
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

  return apiRequest<MuletillasEvaluationDto, FormData>('/muletillas/evaluate', {
    method: 'POST',
    body: formData,
  })
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
