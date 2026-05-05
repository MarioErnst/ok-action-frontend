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
  // Fall back to a generic message if the reason key is not mapped.
  const message = REASON_MESSAGES[reason] ?? 'La sesión terminó.'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-900">Sesión pausada</h2>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>

        {errors.length > 0 && dim && (
          <div className="bg-red-50 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-red-700">
              Errores detectados en {DIM_LABELS[dim]}:
            </p>
            <ul className="flex flex-col gap-1">
              {errors.slice(0, 3).map((error, i) => {
                // Each error type has a distinct shape; render the most useful fields.
                const label =
                  'fix' in error ? `/${error.ph}/ en "${error.w}" — ${error.fix}` :
                  'exp' in error ? `"${error.w}": esperado ${error.exp}, detectado ${error.act}` :
                  `"${(error as { w: string; n: number }).w}" x ${(error as { w: string; n: number }).n}`
                return (
                  <li key={i} className="text-sm text-red-600">- {label}</li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {dim && (
            <button
              onClick={() => navigate(DIM_ROUTES[dim])}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold
                         hover:bg-blue-700 active:scale-95 transition-all"
            >
              Ir al ejercicio de {DIM_LABELS[dim]}
            </button>
          )}
          <button
            onClick={onContinue}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium
                       hover:bg-gray-50 active:scale-95 transition-all"
          >
            Nueva sesión
          </button>
        </div>
      </div>
    </div>
  )
}
