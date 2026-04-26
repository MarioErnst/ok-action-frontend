import { useEffect, useRef, useState } from 'react'
import { toSavePronunciationSessionDto } from '../../infrastructure/mappers/pronunciationMapper'
import { HttpPronunciationRepository } from '../../infrastructure/repositories/HttpPronunciationRepository'
import type { PronunciationSessionResult } from '../../types'
import PhonemeFeedback from '../molecules/PhonemeFeedback'
import PronunciationMetrics from '../molecules/PronunciationMetrics'

const LEVEL_LABELS: Record<string, string> = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

function getScoreBorderClass(score: number): string {
  if (score >= 70) return 'border-success'
  if (score >= 40) return 'border-warning'
  return 'border-danger'
}

interface PronunciationResultsScreenProps {
  result: PronunciationSessionResult
  onReset: () => void
}

export default function PronunciationResultsScreen({
  result,
  onReset,
}: PronunciationResultsScreenProps) {
  const savedRef = useRef(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    HttpPronunciationRepository.saveSession(toSavePronunciationSessionDto(result)).catch(() => {})
  }, [result])

  const overallScore = Math.round(result.metrics.overallScore)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        <div
          className={`flex h-32 w-32 items-center justify-center rounded-full border-4 ${getScoreBorderClass(overallScore)}`}
        >
          <span className={`text-4xl font-bold ${getScoreColorClass(overallScore)}`}>
            {overallScore}
          </span>
        </div>
        <p className="text-sm text-text-muted">Puntuacion general</p>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-text-muted">
          Nivel: {LEVEL_LABELS[result.level] ?? result.level}
        </span>
      </div>

      <PronunciationMetrics metrics={result.metrics} />

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wider text-text-muted">Retroalimentacion</p>
        <p className="mt-2 text-sm text-text">{result.summaryFeedback}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wider text-text-muted">Detalle por frase</p>
        {result.phraseEvaluations.map((evaluation, index) => (
          <div key={index} className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-xs text-text-muted">Frase {index + 1}</p>
                <p className="truncate text-sm text-text">{evaluation.phraseText}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`font-bold ${getScoreColorClass(evaluation.metrics.overallScore)}`}>
                  {Math.round(evaluation.metrics.overallScore)}
                </span>
                <span className="text-text-muted">{expandedIndex === index ? '▲' : '▼'}</span>
              </div>
            </button>
            {expandedIndex === index && (
              <div className="flex flex-col gap-3 border-t border-border p-4">
                <PronunciationMetrics metrics={evaluation.metrics} />
                <PhonemeFeedback
                  feedback={evaluation.feedback}
                  phonemeErrors={evaluation.phonemeErrors}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl bg-accent px-8 py-3 font-bold text-bg"
      >
        Nueva sesion
      </button>
    </div>
  )
}
