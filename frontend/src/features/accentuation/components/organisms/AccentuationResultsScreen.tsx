import { useEffect, useRef, useState } from 'react';
import { toSaveAccentuationSessionDto } from '../../infrastructure/mappers/accentuationMapper';
import { HttpAccentuationRepository } from '../../infrastructure/repositories/HttpAccentuationRepository';
import type { AccentuationSessionResult, PhraseEvaluation } from '../../types';
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
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsExpanded((previous) => !previous)}
      >
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-xs text-text-muted">Frase {index + 1}</p>
          <p className="truncate text-sm text-text">{evaluation.phraseText}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-bold ${getScoreColorClass(evaluation.metrics.overallScore)}`}>
            {Math.round(evaluation.metrics.overallScore)}
          </span>
          <span className="text-text-muted">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
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
  const savedRef = useRef(false);

  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      const dto = toSaveAccentuationSessionDto(result);
      HttpAccentuationRepository.saveSession(dto).catch((error) => {
        console.error('Error al guardar la sesion de acentuacion:', error);
      });
    }
  }, [result]);

  const overallScore = Math.round(result.metrics.overallScore);
  const scoreColorClass = getScoreColorClass(overallScore);
  const scoreBorderClass = getScoreBorderClass(overallScore);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        <div
          className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${scoreBorderClass}`}
        >
          <span className={`text-4xl font-bold ${scoreColorClass}`}>{overallScore}</span>
        </div>
        <p className="text-sm text-text-muted">Puntuacion general</p>
      </div>

      <AccentuationMetrics metrics={result.metrics} />

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Retroalimentacion</p>
        <p className="mt-2 text-sm text-text">{result.summaryFeedback}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wider text-text-muted">Detalle por frase</p>
        {result.phraseEvaluations.map((evaluation, index) => (
          <PhraseResultRow key={evaluation.phraseIndex} evaluation={evaluation} index={index} />
        ))}
      </div>

      <button
        type="button"
        className="w-full rounded-xl bg-accent px-8 py-3 font-bold text-bg"
        onClick={onReset}
      >
        Repetir evaluacion
      </button>
    </div>
  );
}
