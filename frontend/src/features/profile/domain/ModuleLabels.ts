import type { ModuleSlug, TimelineModuleFilter } from './Timeline';

// User-facing Spanish labels for every module the dashboard plots.
// Kept here instead of in the chip molecule so any consumer of a ModuleSlug
// (legend, tooltip, breadcrumb, future filters) reads the same wording.
export const MODULE_LABELS: Record<ModuleSlug, string> = {
  phonation: 'Fonación',
  loudness: 'Volumen',
  accentuation: 'Acentuación',
  pronunciation: 'Pronunciación',
  muletillas: 'Muletillas',
  pauses: 'Pausas',
  precision: 'Precisión',
  linguistic_versatility: 'Versatilidad',
  facial_expression: 'Expresión Facial',
  body_expression: 'Expresión Corporal',
  fluency: 'Fluidez',
  consistency: 'Consistencia',
};

// Canonical order for the chip selector. Mirrors the sidebar grouping
// so the user finds modules in the same place across screens.
export const MODULE_ORDER: ModuleSlug[] = [
  'phonation',
  'pronunciation',
  'accentuation',
  'loudness',
  'pauses',
  'muletillas',
  'precision',
  'facial_expression',
  'body_expression',
  'linguistic_versatility',
  'fluency',
  'consistency',
];

export const FILTER_LABELS: Record<TimelineModuleFilter, string> = {
  all: 'Todos',
  ...MODULE_LABELS,
};
