import { formatMsAsSeconds } from '../../services/pauseFormatters';
import type { PauseInterval } from '../../types';

interface PauseTimelineProps {
  pauses: PauseInterval[];
  durationMs: number;
}

export default function PauseTimeline({ pauses, durationMs }: PauseTimelineProps) {
  if (pauses.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-text-muted">No se detectaron pausas relevantes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-text-muted">Timeline de pausas</p>

      <div className="relative mt-4 h-4 overflow-hidden rounded-full border border-border bg-surface-alt">
        {pauses.map((pause) => {
          const left = durationMs > 0 ? (pause.startMs / durationMs) * 100 : 0;
          const width = durationMs > 0 ? (pause.durationMs / durationMs) * 100 : 0;

          return (
            <span
              key={`${pause.startMs}-${pause.endMs}`}
              className="absolute top-0 h-full rounded-full bg-accent"
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {pauses.map((pause, index) => (
          <div
            key={`${pause.startMs}-${pause.endMs}-row`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-alt px-3 py-2"
          >
            <span className="text-sm text-text">Pausa {index + 1}</span>
            <span className="text-xs text-text-muted">
              {formatMsAsSeconds(pause.startMs)} - {formatMsAsSeconds(pause.endMs)} ·{' '}
              {formatMsAsSeconds(pause.durationMs)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
