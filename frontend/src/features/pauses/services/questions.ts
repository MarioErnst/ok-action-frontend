import type { PausePrompt } from '../types';

export const PAUSE_QUESTIONS: PausePrompt[] = [
  {
    id: 'public-speaking-experience',
    text: 'Describe brevemente una experiencia presentando frente a otras personas.',
  },
  {
    id: 'team-explanation',
    text: 'Explica como resolverias un problema importante con tu equipo.',
  },
  {
    id: 'learning-goal',
    text: 'Cuenta que habilidad comunicacional te gustaria mejorar y por que.',
  },
];

export function getDefaultPauseQuestion(): PausePrompt {
  return PAUSE_QUESTIONS[0];
}
