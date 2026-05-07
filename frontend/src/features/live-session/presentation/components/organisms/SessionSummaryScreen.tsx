import { useNavigate } from 'react-router-dom'
import type { AnalysisResult, LiveDim } from '../../../domain/LiveSession'
import { DIM_LABELS } from '../../../domain/liveDimLabels'
import { aggregateErrors, dimAvgScore, scoreColor, scoreBorderGlow } from '../../utils/sessionSummaryHelpers'
import { PronErrorList } from '../molecules/PronErrorList'
import { AccErrorList } from '../molecules/AccErrorList'
import { MulList } from '../molecules/MulList'

const DIM_ROUTES: Record<LiveDim, string> = {
  pron: '/pronunciacion',
  acc: '/acentuacion',
  mul: '/muletillas',
  precision: '/precision',
}

const STOP_REASON_LABELS: Record<string, string> = {
  time_limit: 'Se agotó el tiempo de la sesión (5 min).',
  user_ended: 'Terminaste la sesión manualmente.',
  low_score: 'Tu puntuación bajó del mínimo requerido.',
  error_threshold: 'Se superó el límite de errores acumulados.',
}

interface Props {
  analyses: AnalysisResult[]
  selectedDims: LiveDim[]
  stopReason: string | null
  onReset: () => void
}

export function SessionSummaryScreen({ analyses, selectedDims, stopReason, onReset }: Props) {
  const navigate = useNavigate()

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((sum, a) => sum + a.overall, 0) / analyses.length)
    : null

  const errors = aggregateErrors(analyses, selectedDims)
  const { border, glow } = avgScore !== null ? scoreBorderGlow(avgScore) : { border: 'border-border', glow: {} }

  const totalErrorCount =
    errors.pron.reduce((s, e) => s + e.count, 0) +
    errors.acc.reduce((s, e) => s + e.count, 0) +
    errors.mul.reduce((s, e) => s + e.totalCount, 0)

  return (
    <div className="flex flex-col gap-8 p-6 pb-28 w-full max-w-md mx-auto animate-fade-in">

      {/* Header + score */}
      <div className="flex flex-col items-center gap-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-accent/10 blur-[50px] rounded-full pointer-events-none" />
        {avgScore !== null ? (
          <div
            className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 ${border} bg-surface/50 backdrop-blur-md`}
            style={glow}
          >
            <span className={`text-5xl font-extrabold ${scoreColor(avgScore)}`}>{avgScore}</span>
          </div>
        ) : (
          <div className="h-36 w-36 rounded-full border-4 border-border bg-surface/50 flex items-center justify-center">
            <span className="text-text-muted text-sm">Sin datos</span>
          </div>
        )}
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Puntuación promedio</p>
        <p className="text-sm text-text-muted text-center">
          {STOP_REASON_LABELS[stopReason ?? ''] ?? 'Sesión finalizada.'}
        </p>
        <div className="flex gap-3 text-xs text-text-muted">
          <span className="rounded-full border border-border/50 bg-surface px-3 py-1">
            {analyses.length} ciclo{analyses.length !== 1 ? 's' : ''} analizado{analyses.length !== 1 ? 's' : ''}
          </span>
          {totalErrorCount > 0 && (
            <span className="rounded-full border border-danger/30 bg-danger/10 text-danger px-3 py-1">
              {totalErrorCount} error{totalErrorCount !== 1 ? 'es' : ''} en total
            </span>
          )}
        </div>
      </div>

      {/* Per-dimension breakdown */}
      {selectedDims.map((dim) => {
        const avgDimScore = dimAvgScore(analyses, dim)
        const dimErrors = dim === 'pron' ? errors.pron : dim === 'acc' ? errors.acc : null
        const dimMuls = dim === 'mul' ? errors.mul : null
        const hasErrors = dimErrors ? dimErrors.length > 0 : dimMuls ? dimMuls.length > 0 : false

        return (
          <div key={dim} className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">{DIM_LABELS[dim]}</p>
                <p className="text-sm text-text-muted mt-0.5">
                  {hasErrors
                    ? `${dimErrors?.length ?? dimMuls?.length} tipo${(dimErrors?.length ?? dimMuls?.length ?? 0) !== 1 ? 's' : ''} de error${(dimErrors?.length ?? dimMuls?.length ?? 0) !== 1 ? 'es' : ''} detectado${(dimErrors?.length ?? dimMuls?.length ?? 0) !== 1 ? 's' : ''}`
                    : 'Sin errores'}
                </p>
              </div>
              {avgDimScore !== null && (
                <span className={`text-2xl font-extrabold ${scoreColor(avgDimScore)}`}>
                  {avgDimScore}
                </span>
              )}
            </div>

            <div className="border-t border-border/40 pt-4">
              {dim === 'pron' && <PronErrorList errors={errors.pron} />}
              {dim === 'acc' && <AccErrorList errors={errors.acc} />}
              {dim === 'mul' && <MulList muls={errors.mul} />}
            </div>

            {hasErrors && (
              <button
                onClick={() => navigate(DIM_ROUTES[dim])}
                className="w-full py-2.5 rounded-xl border border-accent/40 text-accent text-sm font-semibold
                           hover:bg-accent/10 active:scale-95 transition-all duration-200"
              >
                Practicar {DIM_LABELS[dim]}
              </button>
            )}
          </div>
        )
      })}

      {/* CTA */}
      <button
        onClick={onReset}
        className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover
                   py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)]
                   transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
      >
        Nueva sesión
      </button>
    </div>
  )
}
