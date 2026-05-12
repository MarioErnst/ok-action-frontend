import PauseMetricsSummary from '../molecules/PauseMetricsSummary';
import { formatDuration } from '../../services/pauseFormatters';
import type { PauseDetectionPhase, PauseMetrics } from '../../types';

interface PauseRecordingScreenProps {
  promptText: string;
  phase: PauseDetectionPhase;
  elapsedMs: number;
  durationMs: number;
  db: number;
  noiseFloor: number;
  isSilent: boolean;
  currentMetrics: PauseMetrics;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export default function PauseRecordingScreen({
  promptText,
  phase,
  elapsedMs,
  durationMs,
  db,
  noiseFloor,
  isSilent,
  currentMetrics,
  onStart,
  onStop,
  onReset,
}: PauseRecordingScreenProps) {
  const progress = durationMs > 0 ? Math.min(100, (elapsedMs / durationMs) * 100) : 0;

  return (
    <main className="min-h-[100dvh] bg-bg p-4 text-text md:p-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        <header className="rounded-xl border border-border bg-surface p-5">
          <p className="m-0 text-sm text-text-muted">Medicion de pausas</p>
          <h1 className="m-0 mt-2 text-2xl font-bold text-text">Responde con claridad</h1>
          <p className="m-0 mt-2 text-sm leading-relaxed text-text-muted">
            Mantente en silencio durante la calibracion y responde cuando comience la grabacion.
            Las pausas no son un error: aqui medimos ritmo, continuidad e intencion.
          </p>
        </header>

        <section className="rounded-xl border border-accent/40 bg-surface p-5">
          <p className="text-xs uppercase tracking-wider text-text-muted">Pregunta</p>
          <p className="mt-3 text-lg font-semibold leading-relaxed text-text">{promptText}</p>
        </section>

        {phase === 'idle' && (
          <button
            type="button"
            className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-text-on-accent transition-colors hover:bg-accent-hover"
            onClick={onStart}
          >
            Iniciar medicion
          </button>
        )}

        {phase === 'calibrating' && (
          <section className="rounded-xl border border-warning bg-surface p-5 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent" />
            <p className="m-0 font-semibold text-text">Calibrando ruido ambiente</p>
            <p className="m-0 mt-1 text-sm text-text-muted">Mantente en silencio unos segundos.</p>
          </section>
        )}

        {phase === 'recording' && (
          <>
            <section className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="m-0 text-sm text-text-muted">Tiempo</p>
                  <p className="m-0 mt-1 text-2xl font-bold text-text">
                    {formatDuration(elapsedMs)} / {formatDuration(durationMs)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    isSilent ? 'bg-warning text-bg' : 'bg-success text-bg'
                  }`}
                >
                  {isSilent ? 'Silencio' : 'Voz'}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-alt">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-surface-alt p-3">
                  <p className="text-text-muted">dB actual</p>
                  <p className="mt-1 font-bold text-text">{db.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-alt p-3">
                  <p className="text-text-muted">Ruido base</p>
                  <p className="mt-1 font-bold text-text">{noiseFloor.toFixed(1)}</p>
                </div>
              </div>
            </section>

            <PauseMetricsSummary metrics={currentMetrics} />

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-border px-4 py-3 font-bold text-text-muted"
                onClick={onReset}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-accent px-4 py-3 font-bold text-text-on-accent"
                onClick={onStop}
              >
                Ver resultado
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
