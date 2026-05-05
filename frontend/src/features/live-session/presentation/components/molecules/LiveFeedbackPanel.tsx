import type { AnalysisResult, LiveDim } from '../../../domain/LiveSession'
import { DIM_LABELS } from '../../../domain/liveDimLabels'

function ScoreBadge({ score }: { score: number }) {
  // Color thresholds: green >= 70, yellow >= 40, red below 40.
  const color =
    score >= 70 ? 'text-green-600 bg-green-50' :
    score >= 40 ? 'text-yellow-600 bg-yellow-50' :
                  'text-red-600 bg-red-50'
  return (
    <span className={`text-lg font-bold px-2 py-1 rounded-lg ${color}`}>
      {score}
    </span>
  )
}

interface Props {
  analysis: AnalysisResult
  selectedDims: LiveDim[]
  elapsedSeconds: number
}

export function LiveFeedbackPanel({ analysis, selectedDims, elapsedSeconds }: Props) {
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0')

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">Análisis en tiempo real</span>
        <span className="font-mono text-sm text-gray-400">{minutes}:{seconds}</span>
      </div>

      <div className="grid gap-3">
        {selectedDims.map((dim) => {
          const dimData = analysis.dims[dim]
          if (!dimData) return null
          // Count both typed error arrays and detected muletillas entries.
          const errorCount = (dimData.err?.length ?? 0) + (dimData.det?.length ?? 0)
          return (
            <div key={dim} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{DIM_LABELS[dim]}</span>
                {errorCount > 0 && (
                  <span className="ml-2 text-xs text-red-500">
                    {errorCount} error{errorCount !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              <ScoreBadge score={dimData.sc} />
            </div>
          )
        })}
      </div>

      {analysis.fb && (
        <p className="text-sm text-gray-600 border-t pt-3 border-gray-100 italic">
          {analysis.fb}
        </p>
      )}
    </div>
  )
}
