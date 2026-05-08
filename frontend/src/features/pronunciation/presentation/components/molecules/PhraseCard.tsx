import type { PhraseState } from '../../../types'

interface PhraseCardProps {
  phraseState: PhraseState
  isActive: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  recording: 'Grabando',
  uploading: 'Evaluando',
  evaluated: 'Evaluada',
  error: 'Error',
}

function getStatusColorClass(status: string): string {
  switch (status) {
    case 'evaluated': return 'text-success'
    case 'recording': return 'text-danger'
    case 'uploading': return 'text-warning'
    case 'error': return 'text-danger'
    default: return 'text-text-muted'
  }
}

export default function PhraseCard({ phraseState, isActive }: PhraseCardProps) {
  const { phrase, status, evaluation } = phraseState

  return (
    <div
      className={`flex items-center justify-between rounded-xl border bg-surface p-4 transition-all ${
        isActive ? 'border-accent' : 'border-border'
      }`}
    >
      <p className="flex-1 truncate pr-3 text-sm text-text">{phrase.text}</p>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-xs ${getStatusColorClass(status)}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
        {evaluation && (
          <span className={`text-xs font-bold ${getStatusColorClass('evaluated')}`}>
            {Math.round(evaluation.metrics.overallScore)}
          </span>
        )}
      </div>
    </div>
  )
}
