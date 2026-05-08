import type { LoudnessBand, LoudnessMetrics } from '../../../types';
import { formatDuration, formatSeconds } from '../../../services/loudnessFormatters';

interface SessionMetricsProps {
  metrics: LoudnessMetrics;
  presetLabel: string;
}

const BAND_LABELS: Record<Exclude<LoudnessBand, 'silence'>, string> = {
  'too-low': 'Muy bajo',
  optimal: 'Óptimo',
  'too-high': 'Muy alto',
  clipping: 'Saturación',
};

function getOptimalPercentClass(optimalPercent: number): string {
  if (optimalPercent >= 70) return 'text-success';
  if (optimalPercent >= 40) return 'text-warning';
  return 'text-danger';
}

export default function SessionMetrics({ metrics, presetLabel }: SessionMetricsProps) {
  const optimalPercent = Math.round(metrics.optimalPercent);
  const optimalPercentClass = getOptimalPercentClass(metrics.optimalPercent);

  const rows: Array<{ band: Exclude<LoudnessBand, 'silence'>; valueMs: number }> = [
    { band: 'too-low', valueMs: metrics.bandTimeMs['too-low'] },
    { band: 'optimal', valueMs: metrics.bandTimeMs.optimal },
    { band: 'too-high', valueMs: metrics.bandTimeMs['too-high'] },
  ];

  if (metrics.bandTimeMs.clipping > 0) {
    rows.push({ band: 'clipping', valueMs: metrics.bandTimeMs.clipping });
  }

  return (
    <div className="w-full text-text animate-fade-in">
      <div className="mb-6">
        <p className="m-0 text-xs font-bold uppercase tracking-widest text-text-muted">{presetLabel}</p>
        <h3 className="m-0 mt-2 text-2xl font-extrabold text-text tracking-wide">Resumen de la sesión</h3>
      </div>

      <div className="relative rounded-3xl border border-border/50 bg-surface/40 backdrop-blur-md px-6 py-8 text-center overflow-hidden shadow-inner group transition-all duration-300 hover:border-accent/30 hover:bg-surface/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-accent/10 transition-colors duration-500" />
        <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-muted relative z-10">Tiempo en zona óptima</p>
        <p className={`m-0 mt-3 text-5xl font-extrabold tracking-tight drop-shadow-md relative z-10 ${optimalPercentClass}`}>{optimalPercent}%</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-surface/60">
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-muted">Duración total</p>
          <p className="m-0 mt-2 text-2xl font-extrabold text-text tracking-wide">{formatDuration(metrics.durationMs)}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-surface/60">
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-text-muted">Pico máximo</p>
          <p className="m-0 mt-2 text-2xl font-extrabold text-text tracking-wide">{metrics.peakDb.toFixed(1)} dB</p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border/50 bg-surface/40 backdrop-blur-sm p-6">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">Desglose por banda</p>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.band} className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-surface/50 px-4 py-3 shadow-inner hover:bg-surface transition-colors">
              <span className="text-sm font-bold text-text uppercase tracking-wider">{BAND_LABELS[row.band]}</span>
              <span className="text-sm font-extrabold text-text-muted bg-surface-alt/50 px-2 py-0.5 rounded-lg border border-white/5">{formatSeconds(row.valueMs)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}