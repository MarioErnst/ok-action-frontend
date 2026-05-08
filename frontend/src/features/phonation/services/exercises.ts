import type { VoiceExercise } from '../domain/PhonationSession';

export const VOICE_EXERCISES = [
  {
    id: 'sustained-a',
    instruction: 'Diga la vocal /a/ de forma sostenida y cómoda',
    durationMs: 5000,
    targetHzRange: { min: 85, max: 300 },
    type: 'sustained',
  },
  {
    id: 'sustained-e',
    instruction: 'Diga la vocal /e/ de forma sostenida y cómoda',
    durationMs: 5000,
    targetHzRange: { min: 85, max: 300 },
    type: 'sustained',
  },
  {
    id: 'sustained-i',
    instruction: 'Diga la vocal /i/ de forma sostenida y cómoda',
    durationMs: 5000,
    targetHzRange: { min: 85, max: 300 },
    type: 'sustained',
  },
  {
    id: 'phrase-1',
    instruction: 'Lea en voz alta: El sol brilla sobre las montañas cada mañana',
    durationMs: 6000,
    targetHzRange: { min: 75, max: 350 },
    type: 'phrase',
  },
  {
    id: 'glissando-up',
    instruction: 'Diga /a/ subiendo el tono gradualmente de grave a agudo',
    durationMs: 5000,
    targetHzRange: { min: 80, max: 400 },
    type: 'glissando',
  },
  {
    id: 'glissando-down',
    instruction: 'Diga /a/ bajando el tono gradualmente de agudo a grave',
    durationMs: 5000,
    targetHzRange: { min: 80, max: 400 },
    type: 'glissando',
  },
] as const satisfies VoiceExercise[];
