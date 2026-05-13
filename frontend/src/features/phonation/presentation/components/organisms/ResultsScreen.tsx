import { VOICE_EXERCISES } from '../../../services/exercises';
import type { SessionExtendedMetrics, SessionResult } from '../../../domain/PhonationSession';

interface ResultsScreenProps {
  result: SessionResult | null;
  onReset: () => void;
}

// Bands chosen from the research baseline in documentacion/modulos/fonacion.md:
// sustained voicing of 3+ s is the threshold for "buen soporte respiratorio"
// in basic phonation testing.
function describeSustainedVoicing(ms: number): { label: string; tone: 'good' | 'ok' | 'weak' } {
  if (ms >= 3000) return { label: 'buen soporte', tone: 'good' };
  if (ms >= 1500) return { label: 'aceptable', tone: 'ok' };
  return { label: 'corto', tone: 'weak' };
}

function describeSlope(slopePerSec: number): { label: string; tone: 'good' | 'ok' | 'weak' } {
  const abs = Math.abs(slopePerSec);
  if (abs <= 1) return { label: 'estable', tone: 'good' };
  if (abs <= 3) return { label: slopePerSec < 0 ? 'leve descenso' : 'leve ascenso', tone: 'ok' };
  return { label: slopePerSec < 0 ? 'desvanece' : 'subiendo fuerte', tone: 'weak' };
}

function describeWeakEndings(count: number): { label: string; tone: 'good' | 'ok' | 'weak' } {
  if (count === 0) return { label: 'sin finales débiles', tone: 'good' };
  if (count <= 2) return { label: 'puntual', tone: 'ok' };
  return { label: 'frecuente', tone: 'weak' };
}

const TONE_CLASSES: Record<'good' | 'ok' | 'weak', string> = {
  good: 'text-success',
  ok: 'text-warning',
  weak: 'text-danger',
};

function getScoreColor(score: number): 'text-success' | 'text-warning' | 'text-danger' {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}

function getScoreBorderColor(score: number): 'border-success' | 'border-warning' | 'border-danger' {
  if (score >= 70) return 'border-success';
  if (score >= 40) return 'border-warning';
  return 'border-danger';
}

function truncateInstruction(instruction: string, maxLength: number): string {
  if (instruction.length <= maxLength) return instruction;
  return `${instruction.slice(0, maxLength - 3)}...`;
}

export const ResultsScreen = ({ result, onReset }: ResultsScreenProps) => {
  if (!result) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-6 justify-center flex-1 h-full">
          <div className="w-16 h-16 rounded-full border-4 border-surface-alt border-t-accent animate-spin shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          <p className="text-text-muted font-medium animate-pulse">Procesando resultados...</p>
        </div>
      </div>
    );
  }

  const scoreColorClass = getScoreColor(result.overallScore);
  const scoreBorderClass = getScoreBorderColor(result.overallScore);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 p-6 pb-28 animate-fade-in relative z-10">
      <div className="flex flex-col items-center gap-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-accent/10 blur-[50px] rounded-full pointer-events-none animate-pulse-glow" />

        <div
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 ${scoreBorderClass} shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-surface/50 backdrop-blur-md transition-all duration-500 hover:scale-105`}
          style={result.overallScore >= 70 ? { boxShadow: '0 0 30px rgba(34,197,94,0.3)' } : result.overallScore >= 40 ? { boxShadow: '0 0 30px rgba(250,204,21,0.3)' } : { boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
        >
          <span className={`text-5xl font-extrabold ${scoreColorClass} drop-shadow-md`}>
            {Math.round(result.overallScore)}
          </span>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-text-muted mt-2">Puntuación general</p>
      </div>

      <div className="w-full rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Frecuencia promedio</p>
        <p className="text-3xl font-extrabold text-text bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">{result.avgHz.toFixed(1)} Hz</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {result.exercises.map((exerciseResult, i) => {
          const matchingExercise = VOICE_EXERCISES.find((exercise) => exercise.id === exerciseResult.exerciseId);
          const instruction = matchingExercise?.instruction ?? exerciseResult.exerciseId;
          const stabilityColorClass = getScoreColor(exerciseResult.stability);

          return (
            <div
              key={exerciseResult.exerciseId}
              style={{ animationDelay: `${i * 100}ms` }}
              className="flex items-center justify-between rounded-2xl border border-border/50 bg-surface/60 backdrop-blur-sm p-4 transition-all duration-300 hover:border-accent/40 hover:bg-surface/80 animate-fade-in"
            >
              <div className="min-w-0 flex-1 pr-4">
                <p className="truncate text-sm font-medium text-text" title={instruction}>
                  {truncateInstruction(instruction, 45)}
                </p>
                {exerciseResult.breaks > 0 && (
                  <p className="text-xs font-bold text-danger mt-1 bg-danger/10 px-2 py-0.5 rounded-full inline-block">
                    {exerciseResult.breaks} {exerciseResult.breaks === 1 ? 'quiebre' : 'quiebres'}
                  </p>
                )}
              </div>

              <span
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${stabilityColorClass} bg-surface-alt/80 border border-white/5 shadow-inner min-w-[3rem] text-center`}
              >
                {Math.round(exerciseResult.stability)}%
              </span>
            </div>
          );
        })}
      </div>

      {result.extended ? <ExtendedMetricsPanel metrics={result.extended} /> : null}

      <div className="w-full">
        <h2 className="text-xl font-extrabold text-text tracking-wide mb-3">Observaciones</h2>
        <div className="flex flex-col gap-2 bg-surface/40 backdrop-blur-sm p-5 rounded-3xl border border-border/50">
          {result.observations.map((observation) => (
            <p key={observation} className="text-sm font-medium text-text-muted flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{observation}</span>
            </p>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="mt-4 w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
        onClick={onReset}
      >
        <span className="relative z-10">REPETIR EVALUACIÓN</span>
      </button>
    </div>
  );
};

interface ExtendedMetricsPanelProps {
  metrics: SessionExtendedMetrics;
}

const ExtendedMetricsPanel = ({ metrics }: ExtendedMetricsPanelProps) => {
  const sustained = describeSustainedVoicing(metrics.maxSustainedVoicingMs);
  const slope = describeSlope(metrics.dbSlopeDbPerSec);
  const endings = describeWeakEndings(metrics.weakPhraseEndingsCount);

  return (
    <section className="w-full">
      <h2 className="text-xl font-extrabold text-text tracking-wide mb-3">Soporte respiratorio</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Sostén más largo"
          value={`${(metrics.maxSustainedVoicingMs / 1000).toFixed(1)} s`}
          status={sustained.label}
          tone={sustained.tone}
        />
        <MetricCard
          label="Pendiente de dB"
          value={`${metrics.dbSlopeDbPerSec >= 0 ? '+' : ''}${metrics.dbSlopeDbPerSec.toFixed(1)} dB/s`}
          status={slope.label}
          tone={slope.tone}
        />
        <MetricCard
          label="Finales débiles"
          value={`${metrics.weakPhraseEndingsCount}`}
          status={endings.label}
          tone={endings.tone}
        />
      </div>
    </section>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  status: string;
  tone: 'good' | 'ok' | 'weak';
}

const MetricCard = ({ label, value, status, tone }: MetricCardProps) => (
  <div className="rounded-2xl border border-border/50 bg-surface/60 backdrop-blur-sm p-4 flex flex-col gap-1">
    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{label}</p>
    <p className={`text-2xl font-extrabold ${TONE_CLASSES[tone]}`}>{value}</p>
    <p className="text-xs font-medium text-text-muted">{status}</p>
  </div>
);
