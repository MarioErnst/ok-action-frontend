import type { LoudnessConfig } from '../types';

export const LOUDNESS_PRESETS: LoudnessConfig[] = [
  {
    presetId: 'conversation',
    label: 'Conversación 1:1',
    description: 'Llamadas, reuniones pequeñas',
    minOffsetDb: 12,
    maxOffsetDb: 28,
    clipThresholdDbfs: -3,
  },
  {
    presetId: 'presentation',
    label: 'Presentación grupal',
    description: 'Salas de reuniones, grupos medianos',
    minOffsetDb: 18,
    maxOffsetDb: 35,
    clipThresholdDbfs: -3,
  },
  {
    presetId: 'large-room',
    label: 'Sala grande',
    description: 'Auditorio, clases presenciales',
    minOffsetDb: 25,
    maxOffsetDb: 42,
    clipThresholdDbfs: -3,
  },
];

export function getPresetById(id: string): LoudnessConfig | undefined {
  return LOUDNESS_PRESETS.find((preset) => preset.presetId === id);
}