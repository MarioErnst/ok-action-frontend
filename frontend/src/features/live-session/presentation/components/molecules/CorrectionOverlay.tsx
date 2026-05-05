import type { CorrectionEvent, LiveDim } from '../../../domain/LiveSession'
import { useNavigate } from 'react-router-dom'
import { DIM_LABELS } from '../../../domain/liveDimLabels'

// Routes match the paths defined in AppRouter.tsx.
const DIM_ROUTES: Record<LiveDim, string> = {
  pron: '/pronunciacion',
  acc: '/acentuacion',
  mul: '/muletillas',
}

const REASON_MESSAGES: Record<string, string> = {
  low_score: 'Tu puntuación bajó de 70 en esta dimensión.',
  error_threshold: 'Acumulaste 3 o más errores en la sesión.',
  time_limit: 'Se agotó el tiempo de la sesión.',
  user_ended: 'Terminaste la sesión manualmente.',
}

interface Props {
  correction: CorrectionEvent
  onContinue: () => void
}

export function CorrectionOverlay({ correction, onContinue }: Props) {
  const navigate = useNavigate()
  const { dim, reason, errors } = correction
  const message = REASON_MESSAGES[reason] ?? 'La sesión terminó.'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border/60 rounded-3xl w-full max-w-md p-6 flex flex-col gap-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-scale-in">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Sesión pausada</p>
          <h2 className="text-xl font-extrabold text-text">
            {dim ? `Problema en ${DIM_LABELS[dim]}` : 'Sesión finalizada'}
          </h2>
          <p className="text-sm text-text-muted">{message}</p>
        </div>

        {errors.length > 0 && dim && (
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-danger">
              Errores detectados
            </p>
            <ul className="flex flex-col gap-2">
              {errors.slice(0, 3).map((error, i) => {
                const label =
                  'fix' in error
                    ? `/${(error as { ph: string }).ph}/ en "${(error as { w: string }).w}" — ${(error as { fix: string }).fix}`
                    : 'exp' in error
                    ? `"${(error as { w: string }).w}": esperado ${(error as { exp: string }).exp}, detectado ${(error as { act: string }).act}`
                    : `"${(error as { w: string }).w}" × ${(error as { n: number }).n}`
                return (
                  <li key={i} className="text-sm text-danger flex items-start gap-2">
                    <span className="text-danger/50 mt-0.5">—</span>
                    <span>{label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {dim && (
            <button
              onClick={() => navigate(DIM_ROUTES[dim])}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-hover font-extrabold text-bg
                         shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]
                         active:scale-95 transition-all duration-300"
            >
              Practicar {DIM_LABELS[dim]}
            </button>
          )}
          <button
            onClick={onContinue}
            className="w-full py-3 rounded-2xl border border-border/60 bg-surface-alt/50 text-text-muted
                       font-medium hover:text-text hover:border-border active:scale-95 transition-all duration-200"
          >
            Nueva sesión
          </button>
        </div>
      </div>
    </div>
  )
}
