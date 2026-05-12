import type { EvaluationMetrics } from '../../../domain/AccentuationSession';

interface AccentuationMetricsProps {
  metrics: EvaluationMetrics;
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}

function getBarColorClass(score: number): string {
  if (score >= 70) return 'bg-success';
  if (score >= 40) return 'bg-warning';
  return 'bg-danger';
}

interface MetricRowProps {
  label: string;
  score: number;
}

function MetricRow({ label, score }: MetricRowProps) {
  const scoreColorClass = getScoreColorClass(score);
  const barColorClass = getBarColorClass(score);
  const roundedScore = Math.round(score);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className={`text-xs font-bold ${scoreColorClass}`}>{roundedScore}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-alt">
        <div
          className={`h-1.5 rounded-full ${barColorClass} transition-all duration-500`}
          style={{ width: `${Math.min(roundedScore, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AccentuationMetrics({ metrics }: AccentuationMetricsProps) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <MetricRow label="Pronunciacion" score={metrics.pronunciationScore} />
      <MetricRow label="Ritmo" score={metrics.rhythmScore} />
      <MetricRow label="Entonacion" score={metrics.intonationScore} />
      <MetricRow label="Precision acentual" score={metrics.stressAccuracyScore} />
    </div>
  );
}
