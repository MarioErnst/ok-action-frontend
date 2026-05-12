import type { BodyExpressionSessionResult } from '../../../domain/BodyExpression'
import { BodyMetricBar } from '../atoms/BodyMetricBar'
import { BodyScoreRing } from '../atoms/BodyScoreRing'
import { BodyStatusPill } from '../atoms/BodyStatusPill'
import { BodyMetricGrid } from '../molecules/BodyMetricGrid'

type Props = {
  result: BodyExpressionSessionResult
  onRestart: () => void
  onExit: () => void
}

export function BodyResultsView({ result, onRestart, onExit }: Props) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <BodyStatusPill tone={result.saved ? 'good' : result.status === 'invalid' ? 'warn' : 'bad'}>
          {result.saved ? 'Resultado guardado' : result.status === 'invalid' ? 'No guardado' : 'Guardado fallido'}
        </BodyStatusPill>
        <BodyScoreRing score={result.score} />
        <div>
          <h2 className="text-2xl font-extrabold text-text">Resultado corporal</h2>
          <p className="mt-1 text-sm text-text-muted">Duracion: {formatMs(result.durationMs)}</p>
        </div>
      </div>

      {result.invalidReason && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
          {result.invalidReason}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface/80 p-5">
        <BodyMetricGrid metrics={result.metrics} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BodyMetricBar label="Pose visible" value={result.metrics.trackedPct} />
        <BodyMetricBar label="Manos visibles" value={result.metrics.handsVisiblePct} />
        <BodyMetricBar label="Movimiento excesivo" value={result.metrics.excessiveMovementPct} />
      </div>

      <div className="rounded-2xl border border-border bg-surface/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Feedback
          </p>
          <span className="text-[11px] uppercase tracking-widest text-text-muted">
            {result.feedback.source === 'gemini' ? 'Gemini' : 'Reglas'}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-text">{result.feedback.summary}</p>

        {result.feedback.strengths.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Fortalezas
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-text">
              {result.feedback.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
            A mejorar
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-text">
            {result.feedback.improvements.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>

        <p className="mt-4 rounded-xl bg-surface-alt p-3 text-sm font-semibold leading-relaxed text-text">
          {result.feedback.recommendation}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
        >
          Nueva medicion
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:text-text"
        >
          Volver al inicio
        </button>
      </div>
    </section>
  )
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}
