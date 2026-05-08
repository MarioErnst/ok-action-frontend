import { useNavigate } from 'react-router-dom'
import type { AnalysisResult, LexResult, LiveDim } from '../../../domain/LiveSession'
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
  lex: '/versatilidad-linguistica',
  pause: '/pausas',
  fluency: '/fluidez',
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
  // Result of the end-of-session versatility analysis when 'lex' was selected.
  // Null when lex wasn't requested or the backend call failed.
  lexResult: LexResult | null
  onReset: () => void
}

const RICHNESS_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Vocabulario básico',
  2: 'Vocabulario intermedio',
  3: 'Vocabulario avanzado',
}

export function SessionSummaryScreen({ analyses, selectedDims, stopReason, lexResult, onReset }: Props) {
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
        // Versatility ('lex') is a one-shot analysis at session close, not a
        // cyclic one — render its own panel using lexResult instead of the
        // per-cycle aggregations the other dims rely on.
        if (dim === 'lex') {
          return (
            <div key="lex" className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">{DIM_LABELS.lex}</p>
                  <p className="text-sm text-text-muted mt-0.5">
                    {lexResult && lexResult.audio_intelligible
                      ? RICHNESS_LABELS[lexResult.vocabulary_richness]
                      : lexResult
                        ? 'Audio no claro'
                        : 'Análisis no disponible'}
                  </p>
                </div>
                {lexResult && lexResult.audio_intelligible && (
                  <span className={`text-2xl font-extrabold ${scoreColor(lexResult.versatility_score)}`}>
                    {lexResult.versatility_score}
                  </span>
                )}
              </div>
              {lexResult && lexResult.audio_intelligible && (
                <p className="text-sm text-text leading-relaxed border-t border-border/40 pt-4">
                  {lexResult.feedback}
                </p>
              )}
              {lexResult && lexResult.audio_intelligible && (
                <button
                  onClick={() => navigate(DIM_ROUTES.lex)}
                  className="w-full py-2.5 rounded-xl border border-accent/40 text-accent text-sm font-semibold
                             hover:bg-accent/10 active:scale-95 transition-all duration-200"
                >
                  Practicar {DIM_LABELS.lex}
                </button>
              )}
            </div>
          )
        }

        const avgDimScore = dimAvgScore(analyses, dim)
        const dimErrors = dim === 'pron' ? errors.pron : dim === 'acc' ? errors.acc : null
        const dimMuls = dim === 'mul' ? errors.mul : null
        const pauseData = dim === 'pause' ? [...analyses].reverse().find((analysis) => analysis.dims.pause)?.dims.pause : null
        const fluencyData = dim === 'fluency' ? [...analyses].reverse().find((analysis) => analysis.dims.fluency)?.dims.fluency : null
        const hasErrors = dimErrors ? dimErrors.length > 0 : dimMuls ? dimMuls.length > 0 : false
        const hasPauseIssue = dim === 'pause' && avgDimScore !== null && avgDimScore < 70
        const hasFluencyIssue = dim === 'fluency' && avgDimScore !== null && avgDimScore < 70
        const hasPracticeRoute = dim !== 'precision'

        return (
          <div key={dim} className="rounded-3xl border border-border/60 bg-surface/80 backdrop-blur-md p-5 flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">{DIM_LABELS[dim]}</p>
                <p className="text-sm text-text-muted mt-0.5">
                  {dim === 'pause'
                    ? pauseData?.classification ?? 'Sin datos de pausas'
                    : dim === 'fluency'
                    ? fluencyData?.classification ?? 'Sin datos de fluidez'
                    : hasErrors
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
              {dim === 'pause' && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-surface-alt p-3">
                    <p className="text-lg font-bold text-text">{pauseData?.total_pauses ?? 0}</p>
                    <p className="text-xs text-text-muted">pausas</p>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-3">
                    <p className="text-lg font-bold text-text">
                      {pauseData?.silence_ratio ? Math.round(pauseData.silence_ratio * 100) : 0}%
                    </p>
                    <p className="text-xs text-text-muted">silencio</p>
                  </div>
                  {pauseData?.note && (
                    <p className="col-span-2 text-sm text-text-muted text-left leading-relaxed">{pauseData.note}</p>
                  )}
                </div>
              )}
              {dim === 'fluency' && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-alt p-3">
                    <p className="text-lg font-bold text-text">{fluencyData?.wpm ?? 0}</p>
                    <p className="text-xs text-text-muted">PPM</p>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-3">
                    <p className="text-lg font-bold text-text">{fluencyData?.repetitions ?? 0}</p>
                    <p className="text-xs text-text-muted">repet.</p>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-3">
                    <p className="text-lg font-bold text-text">{fluencyData?.long_blocks ?? 0}</p>
                    <p className="text-xs text-text-muted">bloq.</p>
                  </div>
                  {fluencyData?.note && (
                    <p className="col-span-3 text-left text-sm leading-relaxed text-text-muted">{fluencyData.note}</p>
                  )}
                </div>
              )}
            </div>

            {(hasErrors || hasPauseIssue || hasFluencyIssue) && hasPracticeRoute && (
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
