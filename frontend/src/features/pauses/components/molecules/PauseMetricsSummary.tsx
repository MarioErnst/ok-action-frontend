import { formatMsAsSeconds } from '../../services/pauseFormatters';
import type { PauseMetrics } from '../../types';

interface PauseMetricsSummaryProps {
  metrics: PauseMetrics;
}

const classificationColors: Record<PauseMetrics['classification'], string> = {
  'pocas pausas': 'text-warning',
  'pausas adecuadas': 'text-success',
  'demasiadas pausas': 'text-danger',
};

export default function PauseMetricsSummary({ metrics }: PauseMetricsSummaryProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Pausas</p>
        <p className="mt-1 text-2xl font-bold text-text">{metrics.totalPauses}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Silencio total</p>
        <p className="mt-1 text-2xl font-bold text-text">
          {formatMsAsSeconds(metrics.totalPauseDurationMs)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Pausa promedio</p>
        <p className="mt-1 text-2xl font-bold text-text">
          {formatMsAsSeconds(metrics.averagePauseMs)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Pausa mas larga</p>
        <p className="mt-1 text-2xl font-bold text-text">
          {formatMsAsSeconds(metrics.longestPauseMs)}
        </p>
      </div>

      <div className="col-span-2 rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Clasificacion</p>
        <p className={`mt-1 text-xl font-bold ${classificationColors[metrics.classification]}`}>
          {metrics.classification}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {Math.round(metrics.silenceRatio * 100)}% del tiempo fue silencio relevante.
        </p>
      </div>
    </div>
  );
}
