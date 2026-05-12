import type { AccentuationPhrase } from '../domain/AccentuationSession';

export const ACCENTUATION_PHRASES: AccentuationPhrase[] = [
  {
    id: 'phrase-1',
    text: 'El pajaro cantaba sobre el arbol mas alto del jardin.',
    category: 'declarative',
  },
  {
    id: 'phrase-2',
    text: 'La musica clasica transmite emociones profundas.',
    category: 'declarative',
  },
  {
    id: 'phrase-3',
    text: 'Donde compraste esa lampara tan bonita?',
    category: 'interrogative',
  },
  {
    id: 'phrase-4',
    text: 'Que espectaculo tan magnifico!',
    category: 'exclamative',
  },
  {
    id: 'phrase-5',
    text: 'El medico le recomendo tomar la medicina despues del almuerzo.',
    category: 'declarative',
  },
  {
    id: 'phrase-6',
    text: 'Los examenes de matematicas fueron dificiles pero necesarios.',
    category: 'declarative',
  },
];
