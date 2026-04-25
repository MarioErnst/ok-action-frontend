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

    HttpPronunciationRepository.saveSession(toSavePronunciationSessionDto(result)).catch(
      () => {},
    )
  }, [result])

  const overallScore = Math.round(result.metrics.overallScore)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Resultado</h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
          Nivel: {LEVEL_LABELS[result.level] ?? result.level}
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
          {overallScore}
        </div>
        <p className="text-sm text-gray-500">Puntaje general</p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <p className="mb-4 text-sm font-medium text-gray-700">Metricas</p>
        <PronunciationMetrics metrics={result.metrics} />
      </div>

      <p className="text-sm text-gray-700">{result.summaryFeedback}</p>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-500">Detalle por frase</p>
        {result.phraseEvaluations.map((evaluation, index) => (
          <div key={index} className="rounded-xl border border-gray-200">
            <button
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
              <span className="text-sm text-gray-800 flex-1 pr-2">{evaluation.phraseText}</span>
              <span className="shrink-0 text-sm font-semibold text-blue-700">
                {Math.round(evaluation.metrics.overallScore)}
              </span>
            </button>
            {expandedIndex === index && (
              <div className="border-t border-gray-100 p-4">
                <PronunciationMetrics metrics={evaluation.metrics} />
                <div className="mt-3">
                  <PhonemeFeedback
                    feedback={evaluation.feedback}
                    phonemeErrors={evaluation.phonemeErrors}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-blue-600 py-3 text-blue-600 font-medium hover:bg-blue-50"
      >
        Nueva sesion
      </button>
    </div>
  )
}
