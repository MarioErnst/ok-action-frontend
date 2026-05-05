import type { LiveDim } from '../../../domain/LiveSession'
import { DIM_LABELS } from '../../../domain/liveDimLabels'

interface Props {
  selected: LiveDim[]
  onToggle: (dim: LiveDim) => void
  onStart: () => void
  isStartDisabled: boolean
}

export function DimensionSelector({ selected, onToggle, onStart, isStartDisabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 p-6 w-full max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sesión Libre</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Selecciona qué quieres entrenar y habla con naturalidad.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {(Object.keys(DIM_LABELS) as LiveDim[]).map((dim) => {
          const isActive = selected.includes(dim)
          return (
            <button
              key={dim}
              onClick={() => onToggle(dim)}
              className={`
                flex items-center gap-3 w-full p-4 rounded-xl border-2 text-left transition-all
                ${isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                ${isActive ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
              `}>
                {isActive && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="font-medium">{DIM_LABELS[dim]}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={onStart}
        disabled={isStartDisabled}
        className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg
                   disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700
                   active:scale-95 transition-all"
      >
        Comenzar sesión libre
      </button>
    </div>
  )
}
