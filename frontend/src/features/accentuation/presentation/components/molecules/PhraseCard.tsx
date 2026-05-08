import type { PhraseState } from '../../../domain/AccentuationSession';

interface PhraseCardProps {
  phraseState: PhraseState;
  isActive: boolean;
}

function StatusIndicator({ status }: { status: PhraseState['status'] }) {
  if (status === 'recording') {
    return (
      <span className="flex items-center gap-1 text-xs text-danger">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        Grabando
      </span>
    );
  }
  if (status === 'uploading') {
    return <span className="text-xs text-text-muted">Evaluando...</span>;
  }
  if (status === 'evaluated') {
    return <span className="text-xs text-success">Listo</span>;
  }
  if (status === 'error') {
    return <span className="text-xs text-danger">Error al evaluar</span>;
  }
  return <span className="text-xs text-text-muted">Pendiente</span>;
}

export default function PhraseCard({ phraseState, isActive }: PhraseCardProps) {
  const { phrase, status, evaluation } = phraseState;

  const borderClass = isActive ? 'border-accent' : 'border-border';

  return (
    <div className={`flex items-center justify-between rounded-xl border ${borderClass} bg-surface p-4`}>
      <p className="min-w-0 flex-1 truncate pr-3 text-sm text-text" title={phrase.text}>
        {phrase.text}
      </p>

      <div className="flex shrink-0 items-center gap-3">
        <StatusIndicator status={status} />
        {evaluation && (
          <span className="rounded-full bg-surface-alt px-2 py-1 text-xs font-bold text-text">
            {Math.round(evaluation.metrics.overallScore)}
          </span>
        )}
      </div>
    </div>
  );
}
