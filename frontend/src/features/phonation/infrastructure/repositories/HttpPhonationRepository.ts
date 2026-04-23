import { apiRequest } from '../../../../api/client';
import type {
  PhonationSessionDto,
  PhonationSessionListItemDto,
  SavePhonationSessionDto,
} from '../dto/PhonationDtos';

export const HttpPhonationRepository = {
  async saveSession(data: SavePhonationSessionDto): Promise<PhonationSessionDto> {
    return apiRequest<PhonationSessionDto, SavePhonationSessionDto>('/phonation/sessions', {
      method: 'POST',
      body: data,
    });
  },

  async listSessions(): Promise<PhonationSessionListItemDto[]> {
    return apiRequest<PhonationSessionListItemDto[]>('/phonation/sessions');
  },

  async getSession(sessionId: string): Promise<PhonationSessionDto> {
    return apiRequest<PhonationSessionDto>(`/phonation/sessions/${sessionId}`);
  },
};
