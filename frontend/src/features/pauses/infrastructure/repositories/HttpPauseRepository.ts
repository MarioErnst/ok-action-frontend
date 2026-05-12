import { apiRequest } from '../../../../api/client';
import type {
  PauseSessionDto,
  PauseSessionListItemDto,
  SavePauseSessionDto,
} from '../dto/PauseDtos';

export const HttpPauseRepository = {
  async saveSession(data: SavePauseSessionDto): Promise<PauseSessionDto> {
    return apiRequest<PauseSessionDto, SavePauseSessionDto>('/pauses/sessions', {
      method: 'POST',
      body: data,
    });
  },

  async listSessions(): Promise<PauseSessionListItemDto[]> {
    return apiRequest<PauseSessionListItemDto[]>('/pauses/sessions');
  },

  async getSession(sessionId: string): Promise<PauseSessionDto> {
    return apiRequest<PauseSessionDto>(`/pauses/sessions/${sessionId}`);
  },
};
