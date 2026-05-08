import type { LoudnessBand } from '../../../types';

interface BandLabelProps {
  band: LoudnessBand;
  className?: string;
}

const BAND_TEXT: Record<LoudnessBand, string> = {
  silence: 'Escuchando...',
  'too-low': 'Muy bajo',
  optimal: 'Volumen adecuado',
  'too-high': 'Muy alto',
  clipping: 'Saturando',
};

const BAND_CLASS: Record<LoudnessBand, string> = {
  silence: 'text-text-muted',
  'too-low': 'text-warning',
  optimal: 'text-success',
  'too-high': 'text-danger',
  clipping: 'text-danger',
};

export default function BandLabel({ band, className = '' }: BandLabelProps) {
  return <span className={`font-semibold ${BAND_CLASS[band]} ${className}`.trim()}>{BAND_TEXT[band]}</span>;
}