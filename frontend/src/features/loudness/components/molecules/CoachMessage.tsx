import BandLabel from '../atoms/BandLabel';
import type { LoudnessBand } from '../../types';

interface CoachMessageProps {
  band: LoudnessBand;
}

const BAND_MESSAGE: Record<LoudnessBand, string> = {
  silence: 'Comienza a hablar cuando estés listo',
  'too-low': 'Proyecta más tu voz hacia el frente',
  optimal: 'Perfecto, sigue así',
  'too-high': 'Baja un poco el volumen',
  clipping: 'Tu voz está saturando el micrófono',
};

const BAND_CONTAINER_CLASS: Record<LoudnessBand, string> = {
  silence: 'border-border bg-surface text-text-muted',
  'too-low': 'border-warning bg-surface text-text',
  optimal: 'border-success bg-surface text-text',
  'too-high': 'border-danger bg-surface text-text',
  clipping: 'border-danger bg-surface text-text',
};

const BAND_ICON: Record<LoudnessBand, string> = {
  silence: '◎',
  'too-low': '↗',
  optimal: '✓',
  'too-high': '↘',
  clipping: '⚠',
};

export default function CoachMessage({ band }: CoachMessageProps) {
  return (
    <div className={`flex items-start gap-3 rounded-[10px] border p-4 ${BAND_CONTAINER_CLASS[band]}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold" aria-hidden="true">
        {BAND_ICON[band]}
      </span>

      <div className="min-w-0 flex-1">
        <BandLabel band={band} className="mb-1 block text-xs uppercase tracking-[0.16em]" />
        <p className="m-0 text-sm font-medium leading-snug md:text-base">
          {BAND_MESSAGE[band]}
        </p>
      </div>
    </div>
  );
}