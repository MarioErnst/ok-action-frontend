import type { LoudnessPreset } from '../domain/LoudnessSession';

// Local fallback presets used by the calibration UI when the backend
// catalog is unreachable or the user has not chosen one yet. The actual
// global presets live in the loudness_presets table; these are the same
// shape so the UI can render them uniformly.
export const LOUDNESS_PRESETS: LoudnessPreset[] = [
  {
    presetId: 'conversation',
    label: 'Conversación 1:1',
    description: 'Llamadas, reuniones pequeñas',
    silenceOffsetDb: 6,
    lowOffsetDb: -8,
    optimalOffsetDb: 10,
    clipThresholdDb: -3,
    isDefault: true,
    isGlobal: true,
  },
  {
    presetId: 'presentation',
    label: 'Presentación grupal',
    description: 'Salas de reuniones, grupos medianos',
    silenceOffsetDb: 6,
    lowOffsetDb: -5,
    optimalOffsetDb: 15,
    clipThresholdDb: -3,
    isDefault: true,
    isGlobal: true,
  },
  {
    presetId: 'large-room',
    label: 'Sala grande',
    description: 'Auditorio, clases presenciales',
    silenceOffsetDb: 6,
    lowOffsetDb: 0,
    optimalOffsetDb: 22,
    clipThresholdDb: -3,
    isDefault: true,
    isGlobal: true,
  },
];

export function getPresetById(id: string): LoudnessPreset | undefined {
  return LOUDNESS_PRESETS.find((preset) => preset.presetId === id);
}
