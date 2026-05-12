import type { ReactNode } from 'react';
import BandLabel from '../atoms/BandLabel';
import type { LoudnessBand } from '../../../domain/LoudnessSession';

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

const ICON_CLASS = 'h-4 w-4';

const BAND_ICON: Record<LoudnessBand, ReactNode> = {
  silence: (
    <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  'too-low': (
    <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9M17 7v8" />
    </svg>
  ),
  optimal: (
    <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  'too-high': (
    <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10M17 17H9M17 17V9" />
    </svg>
  ),
  clipping: (
    <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
};

export default function CoachMessage({ band }: CoachMessageProps) {
  return (
    <div className={`flex items-start gap-3 rounded-[10px] border p-4 ${BAND_CONTAINER_CLASS[band]}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current" aria-hidden="true">
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