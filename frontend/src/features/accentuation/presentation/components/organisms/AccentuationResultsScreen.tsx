import { useState } from 'react';
import type { AccentuationSessionResult, PhraseEvaluation } from '../../../domain/AccentuationSession';
import AccentuationMetrics from '../molecules/AccentuationMetrics';
import EvaluationFeedback from '../molecules/EvaluationFeedback';

interface AccentuationResultsScreenProps {
  result: AccentuationSessionResult;
  onReset: () => void;
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-danger';
}

function getScoreBorderClass(score: number): string {
  if (score >= 70) return 'border-success';
  if (score >= 40) return 'border-warning';
  return 'border-danger';
}

interface PhraseResultRowProps {
  evaluation: PhraseEvaluation;
  index: number;
}

function PhraseResultRow({ evaluation, index }: PhraseResultRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{ animationDelay: `${index * 100}ms` }} className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-surface/60 backdrop-blur-sm p-4 overflow-hidden transition-all duration-300 hover:border-accent/40 animate-fade-in">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left active:scale-[0.98] transition-transform"
        onClick={() => setIsExpanded((previous) => !previous)}
      >
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-xs font-bold text-accent mb-1 uppercase tracking-wider">Frase {index + 1}</p>
          <p className="truncate text-sm font-medium text-text">{evaluation.phraseText}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`font-extrabold text-lg ${getScoreColorClass(evaluation.metrics.overallScore)}`}>
            {Math.round(evaluation.metrics.overallScore)}
          </span>
          <span className="text-accent flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 border border-accent/20">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-4 border-t border-border/40 pt-4 mt-2 bg-surface-alt/30 -mx-4 -mb-4 px-4 pb-4">
          <AccentuationMetrics metrics={evaluation.metrics} />
          <EvaluationFeedback evaluation={evaluation} />
        </div>
      )}
    </div>
  );
}

export default function AccentuationResultsScreen({
  result,
  onReset,
}: AccentuationResultsScreenProps) {
  const overallScore = Math.round(result.metrics.overallScore);
  const scoreColorClass = getScoreColorClass(overallScore);
  const scoreBorderClass = getScoreBorderClass(overallScore);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 p-6 pb-28 animate-fade-in relative z-10">
      <div className="flex flex-col items-center gap-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-accent/10 blur-[50px] rounded-full pointer-events-none animate-pulse-glow" />
        <div
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 ${scoreBorderClass} shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-surface/50 backdrop-blur-md transition-all duration-500 hover:scale-105`}
          style={overallScore >= 70 ? { boxShadow: '0 0 30px rgba(34,197,94,0.3)' } : overallScore >= 40 ? { boxShadow: '0 0 30px rgba(250,204,21,0.3)' } : { boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
        >
          <span className={`text-5xl font-extrabold ${scoreColorClass} drop-shadow-md`}>{overallScore}</span>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-text-muted mt-2">Puntuación general</p>
      </div>

      <div className="bg-surface/40 backdrop-blur-sm rounded-3xl p-5 border border-border/50">
        <AccentuationMetrics metrics={result.metrics} />
      </div>

      <div className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-6 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Retroalimentación</p>
        <p className="text-sm font-medium text-text leading-relaxed">{result.summaryFeedback}</p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted pl-2">Detalle por frase</p>
        {result.phraseEvaluations.map((evaluation, index) => (
          <PhraseResultRow key={evaluation.phraseIndex || index} evaluation={evaluation} index={index} />
        ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
      >
        <span className="relative z-10">NUEVA SESIÓN</span>
      </button>
    </div>
  );
}
