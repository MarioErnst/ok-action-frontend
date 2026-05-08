import type { LoudnessPreset } from '../domain/LoudnessSession';

export const LOUDNESS_PRESETS: LoudnessPreset[] = [
  {
    presetId: 'conversation',
    label: 'Conversación 1:1',
    description: 'Llamadas, reuniones pequeñas',
    silenceOffsetDb: 6,
    tooLowOffsetDb: -8,
    optimalOffsetDb: 10,
    clipThresholdDbfs: -3,
  },
  {
    presetId: 'presentation',
    label: 'Presentación grupal',
    description: 'Salas de reuniones, grupos medianos',
    silenceOffsetDb: 6,
    tooLowOffsetDb: -5,
    optimalOffsetDb: 15,
    clipThresholdDbfs: -3,
  },
  {
    presetId: 'large-room',
    label: 'Sala grande',
    description: 'Auditorio, clases presenciales',
    silenceOffsetDb: 6,
    tooLowOffsetDb: 0,
    optimalOffsetDb: 22,
    clipThresholdDbfs: -3,
  },
];

export function getPresetById(id: string): LoudnessPreset | undefined {
  return LOUDNESS_PRESETS.find((preset) => preset.presetId === id);
}
