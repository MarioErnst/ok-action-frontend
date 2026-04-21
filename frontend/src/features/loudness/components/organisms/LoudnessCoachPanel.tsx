import CoachMessage from '../molecules/CoachMessage';
import LoudnessMeter from '../molecules/LoudnessMeter';
import SessionMetrics from '../molecules/SessionMetrics';
import type { LoudnessBand, LoudnessConfig, LoudnessMetrics } from '../../types';

interface LoudnessCoachPanelProps {
  band: LoudnessBand;
  db: number;
  noiseFloor: number;
  config: LoudnessConfig;
  isCalibrating: boolean;
  isListening: boolean;
  metrics: LoudnessMetrics;
  onStart(): void;
  onStop(): void;
}

function hasFinishedSession(isListening: boolean, isCalibrating: boolean, metrics: LoudnessMetrics): boolean {
  return !isListening && !isCalibrating && metrics.durationMs > 0;
}

function isIdle(isListening: boolean, isCalibrating: boolean, metrics: LoudnessMetrics): boolean {
  return !isListening && !isCalibrating && metrics.durationMs === 0;
}

export default function LoudnessCoachPanel({
  band,
  db,
  noiseFloor,
  config,
  isCalibrating,
  isListening,
  metrics,
  onStart,
  onStop,
}: LoudnessCoachPanelProps) {
  const finished = hasFinishedSession(isListening, isCalibrating, metrics);
  const idle = isIdle(isListening, isCalibrating, metrics);

  return (
    <section className="w-full rounded-[14px] border border-border bg-bg p-4 text-text md:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="rounded-xl border border-border bg-surface p-4">
          <p className="m-0 text-sm text-text-muted">{config.label}</p>
          <h2 className="m-0 mt-1 text-xl font-semibold text-text">{config.description}</h2>
        </header>

        {idle && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="m-0 text-text-muted">Antes de comenzar, pulsa iniciar sesión para calibrar tu entorno y medir tu voz en tiempo real.</p>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 w-full rounded-xl border border-accent bg-accent px-4 py-3 text-sm font-bold text-text-on-accent transition-colors hover:bg-accent-hover"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {isCalibrating && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" aria-hidden="true" />
            <p className="m-0 text-text-muted">Midiendo tu entorno, mantente en silencio…</p>
          </div>
        )}

        {isListening && !isCalibrating && (
          <div className="space-y-4">
            <CoachMessage band={band} />
            <LoudnessMeter db={db} noiseFloor={noiseFloor} config={config} band={band} />
            <button
              type="button"
              onClick={onStop}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-bold text-text-muted transition-colors hover:text-danger"
            >
              Detener
            </button>
          </div>
        )}

        {finished && (
          <div className="space-y-4">
            <SessionMetrics metrics={metrics} presetLabel={config.label} />
            <button
              type="button"
              onClick={onStart}
              className="w-full rounded-xl border border-accent bg-accent px-4 py-3 text-sm font-bold text-text-on-accent transition-colors hover:bg-accent-hover"
            >
              Volver a intentar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}