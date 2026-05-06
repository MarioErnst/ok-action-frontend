import type { LiveDim } from '../../../domain/LiveSession'
import { DIM_LABELS } from '../../../domain/liveDimLabels'

const DIM_DESCRIPTIONS: Record<LiveDim, string> = {
  pron: 'Vocales, consonantes y fluidez fónica',
  acc: 'Acento prosódico y entonación',
  mul: 'Palabras de relleno y repeticiones',
}

interface Props {
  selected: LiveDim[]
  onToggle: (dim: LiveDim) => void
  onStart: () => void
  isStartDisabled: boolean
}

export function DimensionSelector({ selected, onToggle, onStart, isStartDisabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 p-6 w-full max-w-md mx-auto animate-fade-in">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Sesión libre</p>
        <h1 className="text-3xl font-extrabold text-text">¿Qué entrenamos hoy?</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Habla con naturalidad. Analizamos lo que selecciones en tiempo real.
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
                flex items-center gap-4 w-full p-4 rounded-2xl border text-left transition-all duration-200
                ${isActive
                  ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'border-border/50 bg-surface/60 hover:border-border hover:bg-surface'
                }
              `}
            >
              <div className={`
                w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                ${isActive ? 'bg-accent border-accent' : 'border-border'}
              `}>
                {isActive && (
                  <svg className="w-3 h-3 text-bg" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`font-semibold text-sm ${isActive ? 'text-accent' : 'text-text'}`}>
                  {DIM_LABELS[dim]}
                </span>
                <span className="text-xs text-text-muted">{DIM_DESCRIPTIONS[dim]}</span>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={onStart}
        disabled={isStartDisabled}
        className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover
                   py-4 font-extrabold text-bg shadow-[0_0_20px_rgba(245,158,11,0.3)]
                   transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]
                   disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
      >
        Comenzar sesión libre
      </button>
    </div>
  )
}
