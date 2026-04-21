import type { LoudnessBand, LoudnessMetrics } from '../../types';

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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDuration(durationMs: number): string {
  const safeDuration = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(safeDuration / 60);
  const seconds = safeDuration % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatSeconds(durationMs: number): string {
  return `${(Math.max(0, durationMs) / 1000).toFixed(1)} s`;
}

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
    <section className="w-full rounded-[10px] border border-border bg-surface p-4 text-text">
      <div className="mb-4">
        <p className="m-0 text-sm text-text-muted">{presetLabel}</p>
        <h3 className="m-0 mt-1 text-lg font-semibold text-text">Resumen de la sesión</h3>
      </div>

      <div className="rounded-xl border border-border bg-surface-alt px-4 py-5 text-center">
        <p className="m-0 text-sm text-text-muted">Tiempo en zona óptima</p>
        <p className={`m-0 mt-2 text-4xl font-bold tracking-tight ${optimalPercentClass}`}>{optimalPercent}%</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-alt p-4">
          <p className="m-0 text-sm text-text-muted">Duración total</p>
          <p className="m-0 mt-1 text-xl font-semibold text-text">{formatDuration(metrics.durationMs)}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-alt p-4">
          <p className="m-0 text-sm text-text-muted">Pico máximo</p>
          <p className="m-0 mt-1 text-xl font-semibold text-text">{metrics.peakDb.toFixed(1)} dB</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-alt p-4">
        <p className="mb-3 text-sm text-text-muted">Desglose por banda</p>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.band} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="text-sm font-medium text-text">{BAND_LABELS[row.band]}</span>
              <span className="text-sm text-text-muted">{formatSeconds(row.valueMs)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}