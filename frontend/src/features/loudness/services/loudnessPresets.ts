import type { LoudnessConfig } from '../types';

// Reference levels for laptop microphone at ~30-50cm speaking distance:
//   Whisper / too-low:  above -55 dBFS RMS
//   Normal conversation: -45 to -20 dBFS RMS
//   Projected voice:    -30 to -10 dBFS RMS
//   Shouting:           above -15 dBFS RMS (peaks approach clipping)

export const LOUDNESS_PRESETS: LoudnessConfig[] = [
  {
    presetId: 'conversation',
    label: 'Conversación 1:1',
    description: 'Llamadas, reuniones pequeñas',
    silenceOffsetDb: 6,
    tooLowCeilingDbfs: -45,
    optimalCeilingDbfs: -22,
    clipThresholdDbfs: -3,
  },
  {
    presetId: 'presentation',
    label: 'Presentación grupal',
    description: 'Salas de reuniones, grupos medianos',
    silenceOffsetDb: 6,
    tooLowCeilingDbfs: -40,
    optimalCeilingDbfs: -15,
    clipThresholdDbfs: -3,
  },
  {
    presetId: 'large-room',
    label: 'Sala grande',
    description: 'Auditorio, clases presenciales',
    silenceOffsetDb: 6,
    tooLowCeilingDbfs: -35,
    optimalCeilingDbfs: -10,
    clipThresholdDbfs: -3,
  },
];

export function getPresetById(id: string): LoudnessConfig | undefined {
  return LOUDNESS_PRESETS.find((preset) => preset.presetId === id);
}
