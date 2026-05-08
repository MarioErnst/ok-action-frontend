import type { AnalysisResult, LiveDim } from '../../../domain/LiveSession'
import { DIM_LABELS } from '../../../domain/liveDimLabels'

function scoreColor(score: number) {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

function scoreBg(score: number) {
  if (score >= 70) return 'bg-success/10 border-success/30'
  if (score >= 40) return 'bg-warning/10 border-warning/30'
  return 'bg-danger/10 border-danger/30'
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
    <div className="w-full rounded-2xl border border-border/50 bg-surface/80 backdrop-blur-md p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Análisis en vivo</p>
        <span className="font-mono text-xs text-accent">{minutes}:{seconds}</span>
      </div>

      <div className="flex flex-col gap-3">
        {selectedDims.map((dim) => {
          const dimData = analysis.dims[dim]
          if (!dimData) return null
          const errorCount = (dimData.err?.length ?? 0) + (dimData.det?.length ?? 0)
          const detail = dim === 'consistency' ? dimData.classification ?? dimData.note : null
          return (
            <div key={dim} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text">{DIM_LABELS[dim]}</span>
                {detail && (
                  <span className="text-xs text-text-muted">{detail}</span>
                )}
                {errorCount > 0 && (
                  <span className="text-xs text-danger">
                    {errorCount} error{errorCount !== 1 ? 'es' : ''} detectado{errorCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className={`text-lg font-extrabold px-3 py-1 rounded-xl border ${scoreColor(dimData.sc)} ${scoreBg(dimData.sc)}`}>
                {dimData.sc}
              </span>
            </div>
          )
        })}
      </div>

      {analysis.fb && (
        <p className="text-sm text-text-muted border-t border-border/40 pt-3 leading-relaxed italic">
          {analysis.fb}
        </p>
      )}
    </div>
  )
}
