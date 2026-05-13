export type RadarDimensionModule =
  | 'phonation'
  | 'loudness'
  | 'accentuation'
  | 'pronunciation'
  | 'muletillas'
  | 'pauses'
  | 'fluency'
  | 'precision'
  | 'linguistic_versatility'
  | 'facial_expression';

export type RadarDimension = {
  module: RadarDimensionModule;
  label: string;
  fullLabel: string;
  score: number;
};

// Snapshot of Mario Jr's first completed session per module, queried
// directly from the ok_action_dev database. See
// documentacion/modulos/bienvenida.md for the SQL used.
export const INITIAL_SCORES: RadarDimension[] = [
  { module: 'phonation', label: 'Fonación', fullLabel: 'Fonación', score: 39 },
  { module: 'loudness', label: 'Volumen', fullLabel: 'Volumen', score: 49 },
  { module: 'accentuation', label: 'Acentuación', fullLabel: 'Acentuación', score: 50 },
  { module: 'pronunciation', label: 'Pronunciación', fullLabel: 'Pronunciación', score: 61 },
  { module: 'muletillas', label: 'Muletillas', fullLabel: 'Muletillas', score: 64 },
  { module: 'pauses', label: 'Pausas', fullLabel: 'Pausas', score: 58 },
  { module: 'fluency', label: 'Fluidez', fullLabel: 'Fluidez', score: 55 },
  { module: 'precision', label: 'Precisión', fullLabel: 'Precisión', score: 58 },
  { module: 'linguistic_versatility', label: 'Versatilidad', fullLabel: 'Versatilidad lingüística', score: 46 },
  { module: 'facial_expression', label: 'Expr. facial', fullLabel: 'Expresión facial', score: 58 },
];
