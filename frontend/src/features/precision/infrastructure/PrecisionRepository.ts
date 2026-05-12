import { apiRequest } from '../../../api/client'
import type {
  EvaluateRoundDTO,
  FinalizeSessionDTO,
  PrecisionSessionDTO,
  StartSessionDTO,
  StartSessionRequestDTO,
} from './PrecisionSessionDTO'

export class PrecisionRepository {
  static async startSession(
    rounds_total: number,
    parent_id?: string | null,
  ): Promise<StartSessionDTO> {
    const body: StartSessionRequestDTO = { rounds_total, parent_id: parent_id ?? null }
    return apiRequest<StartSessionDTO, StartSessionRequestDTO>(
      '/precision/sessions',
      { method: 'POST', body },
    )
  }

  static async evaluateRound(
    sessionId: string,
    roundIndex: number,
    promptId: string,
    audioBlob: Blob,
  ): Promise<EvaluateRoundDTO> {
    const form = new FormData()
    form.append('audio', audioBlob, 'response.webm')
    form.append('round_index', String(roundIndex))
    form.append('prompt_id', promptId)

    return apiRequest<EvaluateRoundDTO, FormData>(
      `/precision/sessions/${sessionId}/rounds`,
      { method: 'POST', body: form },
    )
  }

  static async finalizeSession(sessionId: string): Promise<FinalizeSessionDTO> {
    return apiRequest<FinalizeSessionDTO>(
      `/precision/sessions/${sessionId}/finalize`,
      { method: 'POST' },
    )
  }

  static async abandonSession(sessionId: string): Promise<void> {
    await apiRequest<void>(
      `/precision/sessions/${sessionId}/abandon`,
      { method: 'PATCH' },
    )
  }

  static async getSession(sessionId: string): Promise<PrecisionSessionDTO> {
    return apiRequest<PrecisionSessionDTO>(`/precision/sessions/${sessionId}`)
  }
}
