import type { LiveDim } from './LiveSession'

// Single source of truth for user-facing dimension labels across live-session components.
export const DIM_LABELS: Record<LiveDim, string> = {
  pron: 'Pronunciación',
  acc: 'Acentuación',
  mul: 'Muletillas',
  precision: 'Precisión',
  lex: 'Versatilidad',
  pause: 'Pausas',
  fluency: 'Fluidez',
  consistency: 'Consistencia',
}
