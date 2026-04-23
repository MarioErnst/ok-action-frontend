import { apiRequest } from '../../../../api/client';
import type {
  CreateLoudnessPresetDto,
  LoudnessPresetDto,
  LoudnessSessionDto,
  LoudnessSessionListItemDto,
  SaveLoudnessSessionDto,
  UpdateLoudnessPresetDto,
} from '../dto/LoudnessDtos';

export const HttpLoudnessRepository = {
  async listPresets(): Promise<LoudnessPresetDto[]> {
    return apiRequest<LoudnessPresetDto[]>('/loudness/presets');
  },

  async createPreset(data: CreateLoudnessPresetDto): Promise<LoudnessPresetDto> {
    return apiRequest<LoudnessPresetDto, CreateLoudnessPresetDto>('/loudness/presets', {
      method: 'POST',
      body: data,
    });
  },

  async updatePreset(presetId: string, data: UpdateLoudnessPresetDto): Promise<LoudnessPresetDto> {
    return apiRequest<LoudnessPresetDto, UpdateLoudnessPresetDto>(`/loudness/presets/${presetId}`, {
      method: 'PUT',
      body: data,
    });
  },

  async deletePreset(presetId: string): Promise<void> {
    await apiRequest(`/loudness/presets/${presetId}`, { method: 'DELETE' });
  },

  async saveSession(data: SaveLoudnessSessionDto): Promise<LoudnessSessionDto> {
    return apiRequest<LoudnessSessionDto, SaveLoudnessSessionDto>('/loudness/sessions', {
      method: 'POST',
      body: data,
    });
  },

  async listSessions(): Promise<LoudnessSessionListItemDto[]> {
    return apiRequest<LoudnessSessionListItemDto[]>('/loudness/sessions');
  },
};
