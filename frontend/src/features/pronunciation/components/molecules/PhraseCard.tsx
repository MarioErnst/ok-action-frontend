import type { PhraseState } from '../../types'

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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  recording: 'bg-red-100 text-red-600',
  uploading: 'bg-yellow-100 text-yellow-700',
  evaluated: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

export default function PhraseCard({ phraseState, isActive }: PhraseCardProps) {
  const { phrase, status, evaluation } = phraseState
  const statusLabel = STATUS_LABELS[status] ?? status
  const statusColor = STATUS_COLORS[status] ?? ''

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-800">{phrase.text}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      {evaluation && (
        <p className="mt-1 text-right text-sm font-semibold text-blue-700">
          {Math.round(evaluation.metrics.overallScore)}
        </p>
      )}
    </div>
  )
}
