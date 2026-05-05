import { useNavigate } from 'react-router-dom'
import type { AccError, AnalysisResult, LiveDim, MulDetected, PronError } from '../../../domain/LiveSession'
import { DIM_LABELS } from '../../../domain/liveDimLabels'

const DIM_ROUTES: Record<LiveDim, string> = {
  pron: '/pronunciacion',
  acc: '/acentuacion',
  mul: '/muletillas',
}

const STOP_REASON_LABELS: Record<string, string> = {
  time_limit: 'Se agotó el tiempo de la sesión (5 min).',
  user_ended: 'Terminaste la sesión manualmente.',
  low_score: 'Tu puntuación bajó del mínimo requerido.',
  error_threshold: 'Se superó el límite de errores acumulados.',
}

const ACCENT_TYPE_EXPLANATIONS: Record<string, string> = {
  aguda: 'acento en la última sílaba (ej: café, reloj)',
  grave: 'acento en la penúltima sílaba (ej: casa, árbol)',
  esdrujula: 'acento en la antepenúltima sílaba (ej: música, físico)',
  sobreesdrujula: 'acento antes de la antepenúltima sílaba (ej: dígamelo)',
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-success'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}

function scoreBorderGlow(score: number): { border: string; glow: React.CSSProperties } {
  if (score >= 70) return { border: 'border-success', glow: { boxShadow: '0 0 30px rgba(34,197,94,0.25)' } }
  if (score >= 40) return { border: 'border-warning', glow: { boxShadow: '0 0 30px rgba(250,204,21,0.25)' } }
  return { border: 'border-danger', glow: { boxShadow: '0 0 30px rgba(239,68,68,0.25)' } }
}

// --- Aggregation helpers ---

interface AggregatedPronError {
  ph: string
  count: number
  words: string[]
  fix: string
}

interface AggregatedAccError {
  w: string
  exp: string
  act: string
  count: number
}

interface AggregatedMul {
  w: string
  totalCount: number
}

function aggregateErrors(analyses: AnalysisResult[], dims: LiveDim[]) {
  const pronMap = new Map<string, AggregatedPronError>()
  const accMap = new Map<string, AggregatedAccError>()
  const mulMap = new Map<string, AggregatedMul>()

  for (const analysis of analyses) {
    if (dims.includes('pron')) {
      for (const e of (analysis.dims.pron?.err ?? []) as PronError[]) {
        const existing = pronMap.get(e.ph) ?? { ph: e.ph, count: 0, words: [], fix: e.fix }
        existing.count++
        if (!existing.words.includes(e.w)) existing.words.push(e.w)
        existing.fix = e.fix
        pronMap.set(e.ph, existing)
      }
    }
    if (dims.includes('acc')) {
      for (const e of (analysis.dims.acc?.err ?? []) as AccError[]) {
        const key = `${e.w}__${e.exp}`
        const existing = accMap.get(key) ?? { w: e.w, exp: e.exp, act: e.act, count: 0 }
        existing.count++
        accMap.set(key, existing)
      }
    }
    if (dims.includes('mul')) {
      for (const d of (analysis.dims.mul?.det ?? []) as MulDetected[]) {
        const existing = mulMap.get(d.w) ?? { w: d.w, totalCount: 0 }
        existing.totalCount += d.n
        mulMap.set(d.w, existing)
      }
    }
  }

  return {
    pron: [...pronMap.values()].sort((a, b) => b.count - a.count),
    acc: [...accMap.values()].sort((a, b) => b.count - a.count),
    mul: [...mulMap.values()].sort((a, b) => b.totalCount - a.totalCount),
  }
}

function dimAvgScore(analyses: AnalysisResult[], dim: LiveDim): number | null {
  const scores = analyses.map(a => a.dims[dim]?.sc).filter((s): s is number => s !== undefined)
  if (!scores.length) return null
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
}

// --- Sub-components ---

function PronErrorList({ errors }: { errors: AggregatedPronError[] }) {
  if (!errors.length) {
    return <p className="text-sm text-success flex items-center gap-2"><span>✓</span> Sin errores de pronunciación detectados.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {errors.map((e) => (
        <div key={e.ph} className="rounded-xl border border-border/40 bg-surface-alt/30 p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-accent font-bold text-sm">/{e.ph}/</span>
            <span className="text-xs text-danger font-medium">
              {e.count} vez{e.count !== 1 ? 'es' : ''}
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Detectado en: <span className="text-text font-medium">{e.words.map(w => `"${w}"`).join(', ')}</span>
          </p>
          <p className="text-sm text-text leading-relaxed">
            <span className="text-accent font-semibold">Cómo mejorar: </span>{e.fix}
          </p>
        </div>
      ))}
    </div>
  )
}

function AccErrorList({ errors }: { errors: AggregatedAccError[] }) {
  if (!errors.length) {
    return <p className="text-sm text-success flex items-center gap-2"><span>✓</span> Sin errores de acentuación detectados.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {errors.map((e, i) => {
        const expExplanation = ACCENT_TYPE_EXPLANATIONS[e.exp.toLowerCase().replace('ú', 'u').replace('é', 'e')]
        return (
          <div key={i} className="rounded-xl border border-border/40 bg-surface-alt/30 p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-text font-bold">"{e.w}"</span>
              <span className="text-xs text-danger font-medium">
                {e.count} vez{e.count !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-success">Correcto: <strong>{e.exp}</strong></span>
              <span className="text-danger">Detectado: <strong>{e.act}</strong></span>
            </div>
            {expExplanation && (
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="text-accent font-semibold capitalize">{e.exp}</span>: {expExplanation}.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MulList({ muls }: { muls: AggregatedMul[] }) {
  if (!muls.length) {
    return <p className="text-sm text-success flex items-center gap-2"><span>✓</span> No se detectaron muletillas.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {muls.map((m) => (
        <div key={m.w} className="rounded-xl border border-border/40 bg-surface-alt/30 p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-text font-bold">"{m.w}"</span>
            <span className="text-xs text-danger font-medium">
              {m.totalCount} repetición{m.totalCount !== 1 ? 'es' : ''} en total
            </span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Las muletillas fragmentan el discurso y reducen la autoridad percibida por el oyente.
            Reemplázala con una pausa breve o reformula la oración.
          </p>
        </div>
      ))}
    </div>
  )
}

// --- Main component ---

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
