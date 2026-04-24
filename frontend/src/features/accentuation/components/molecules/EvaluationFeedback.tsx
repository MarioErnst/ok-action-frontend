import type { PhraseEvaluation } from '../../types';

interface EvaluationFeedbackProps {
  evaluation: PhraseEvaluation;
}

export default function EvaluationFeedback({ evaluation }: EvaluationFeedbackProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text">{evaluation.feedback}</p>

      {evaluation.specificErrors.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Errores especificos
          </p>
          {evaluation.specificErrors.map((error, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-surface-alt p-3"
            >
              <p className="text-sm font-semibold text-accent">"{error.word}"</p>
              <p className="mt-1 text-xs text-text-muted">
                <span className="text-text">Esperado:</span> {error.expectedStress}
              </p>
              <p className="text-xs text-text-muted">
                <span className="text-text">Problema:</span> {error.actualIssue}
              </p>
              <p className="text-xs text-text-muted">
                <span className="text-text">Sugerencia:</span> {error.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
