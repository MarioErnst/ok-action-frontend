import CoachMessage from '../molecules/CoachMessage';
import LoudnessMeter from '../molecules/LoudnessMeter';
import SessionMetrics from '../molecules/SessionMetrics';
import type {
  CalibrationPhase,
  LoudnessBand,
  LoudnessConfig,
  LoudnessMetrics,
  LoudnessPreset,
} from '../../types';

interface LoudnessCoachPanelProps {
  band: LoudnessBand;
  db: number;
  noiseFloor: number;
  preset: LoudnessPreset;
  effectiveConfig: LoudnessConfig | null;
  calibrationPhase: CalibrationPhase;
  metrics: LoudnessMetrics;
  onStart(): void;
  onStop(): void;
}

function hasFinishedSession(calibrationPhase: CalibrationPhase, metrics: LoudnessMetrics): boolean {
  return calibrationPhase === 'idle' && metrics.durationMs > 0;
}

function isIdle(calibrationPhase: CalibrationPhase, metrics: LoudnessMetrics): boolean {
  return calibrationPhase === 'idle' && metrics.durationMs === 0;
}

export default function LoudnessCoachPanel({
  band,
  db,
  noiseFloor,
  preset,
  effectiveConfig,
  calibrationPhase,
  metrics,
  onStart,
  onStop,
}: LoudnessCoachPanelProps) {
  const finished = hasFinishedSession(calibrationPhase, metrics);
  const idle = isIdle(calibrationPhase, metrics);
  const isNoiseCalibration = calibrationPhase === 'noise';
  const isVoiceCalibration = calibrationPhase === 'voice';
  const isActive = calibrationPhase === 'active' && effectiveConfig !== null;

  return (
    <section className="w-full rounded-[14px] border border-border bg-bg p-4 text-text md:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="rounded-xl border border-border bg-surface p-4">
          <p className="m-0 text-sm text-text-muted">{preset.label}</p>
          <h2 className="m-0 mt-1 text-xl font-semibold text-text">{preset.description}</h2>
        </header>

        {idle && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="m-0 text-text-muted">
              Antes de comenzar, pulsa iniciar sesión para calibrar tu entorno y medir tu voz en tiempo real.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 w-full rounded-xl border border-accent bg-accent px-4 py-3 text-sm font-bold text-text-on-accent transition-colors hover:bg-accent-hover"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {isNoiseCalibration && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div
              className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent"
              aria-hidden="true"
            />
            <p className="m-0 font-medium text-text">Fase 1 de 2 — Ruido de fondo</p>
            <p className="m-0 mt-1 text-sm text-text-muted">Mantente en silencio…</p>
          </div>
        )}

        {isVoiceCalibration && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div
              className="mx-auto mb-4 h-12 w-12 animate-[spin_2s_linear_infinite] rounded-full border-4 border-border border-t-accent"
              aria-hidden="true"
            />
            <p className="m-0 font-medium text-text">Fase 2 de 2 — Calibración de voz</p>
            <p className="m-0 mt-1 text-sm text-text-muted">Habla en voz normal durante 10 segundos…</p>
          </div>
        )}

        {isActive && (
          <div className="space-y-4">
            <CoachMessage band={band} />
            <LoudnessMeter db={db} noiseFloor={noiseFloor} config={effectiveConfig} band={band} />
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
            <SessionMetrics metrics={metrics} presetLabel={preset.label} />
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