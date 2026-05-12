import CoachMessage from '../molecules/CoachMessage';
import LoudnessMeter from '../molecules/LoudnessMeter';
import SessionMetrics from '../molecules/SessionMetrics';
import type {
  CalibrationPhase,
  LoudnessBand,
  LoudnessConfig,
  LoudnessMetrics,
  LoudnessPreset,
} from '../../../domain/LoudnessSession';

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
    <section className="w-full relative z-10 pb-28 animate-fade-in">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] rounded-full pointer-events-none" />
          <p className="m-0 text-xs font-bold uppercase tracking-widest text-accent mb-1">{preset.label}</p>
          <h2 className="m-0 text-xl md:text-2xl font-extrabold text-text relative z-10">{preset.description}</h2>
        </header>

        {idle && (
          <div className="rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-sm p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
            <p className="m-0 text-text-muted leading-relaxed text-center">
              Antes de comenzar, pulsa iniciar sesión para calibrar tu entorno y medir tu voz en tiempo real.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="mt-8 w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            >
              <span className="relative z-10">INICIAR SESIÓN</span>
            </button>
          </div>
        )}

        {isNoiseCalibration && (
          <div className="rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-sm p-10 text-center shadow-lg">
            <div
              className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-surface-alt border-t-accent shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              aria-hidden="true"
            />
            <p className="m-0 text-lg font-bold text-text tracking-wide">Fase 1 de 2 — Ruido de fondo</p>
            <p className="m-0 mt-2 text-sm font-medium text-text-muted animate-pulse">Mantente en silencio…</p>
          </div>
        )}

        {isVoiceCalibration && (
          <div className="rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-sm p-10 text-center shadow-lg">
            <div
              className="mx-auto mb-6 h-16 w-16 animate-[spin_1.5s_linear_infinite] rounded-full border-4 border-surface-alt border-t-success shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              aria-hidden="true"
            />
            <p className="m-0 text-lg font-bold text-text tracking-wide">Fase 2 de 2 — Calibración de voz</p>
            <p className="m-0 mt-2 text-sm font-medium text-text-muted animate-pulse">Habla en voz normal durante 10 segundos…</p>
          </div>
        )}

        {isActive && (
          <div className="flex flex-col gap-6">
            <CoachMessage band={band} />
            <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 shadow-lg">
              <LoudnessMeter db={db} noiseFloor={noiseFloor} config={effectiveConfig} band={band} />
            </div>
            <button
              type="button"
              onClick={onStop}
              className="w-full rounded-2xl border border-danger/50 bg-danger/10 px-4 py-4 text-sm font-extrabold text-danger transition-all duration-300 hover:bg-danger/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 uppercase tracking-wider"
            >
              Detener sesión
            </button>
          </div>
        )}

        {finished && (
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 shadow-lg">
              <SessionMetrics metrics={metrics} presetLabel={preset.label} />
            </div>
            <button
              type="button"
              onClick={onStart}
              className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            >
              <span className="relative z-10">VOLVER A INTENTAR</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}