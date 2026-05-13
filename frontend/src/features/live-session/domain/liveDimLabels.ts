import type { LiveModule } from './LiveSession'

// User-facing labels for the four composable live modules. Single source of
// truth so DimensionSelector and SessionSummaryScreen never disagree.
export const LIVE_MODULE_LABELS: Record<LiveModule, string> = {
  muletillas: 'Muletillas',
  accentuation: 'Acentuación',
  pronunciation: 'Pronunciación',
  facial_expression: 'Expresión facial',
}

export const LIVE_MODULE_DESCRIPTIONS: Record<LiveModule, string> = {
  muletillas: 'Palabras de relleno y repeticiones en el discurso libre.',
  accentuation: 'Acento prosódico, ritmo y entonación natural.',
  pronunciation: 'Vocales, consonantes e inteligibilidad general.',
  facial_expression: 'Expresividad y emociones predominantes durante la sesión.',
}
