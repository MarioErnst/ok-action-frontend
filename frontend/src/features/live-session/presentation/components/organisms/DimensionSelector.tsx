import type { LoudnessPresetDto } from '../../../../loudness/infrastructure/dto/LoudnessDtos'
import {
  LIVE_MODULE_DESCRIPTIONS,
  LIVE_MODULE_LABELS,
} from '../../../domain/liveDimLabels'
import { LIVE_MODULES, type LiveModule } from '../../../domain/LiveSession'

interface Props {
  selected: LiveModule[]
  onToggle: (module: LiveModule) => void
  onStart: () => void
  isStartDisabled: boolean
  // While true the CTA shows the loader label and ignores further
  // clicks. The parent flips this on as soon as start() begins so the
  // user does not retrigger the flow while permission prompts /
  // MediaPipe download are in progress.
  isStarting?: boolean
  // Loudness presets fetched once on mount by the parent. Empty array
  // means we are still loading or the user has none; in that case the
  // dropdown shows a fallback hint when loudness is selected.
  loudnessPresets: LoudnessPresetDto[]
  // Currently chosen preset id when loudness is selected. Null when
  // loudness is not selected or the user has not picked one yet (in
  // which case we default to the first preset on start).
  selectedLoudnessPresetId: string | null
  onSelectLoudnessPreset: (presetId: string) => void
}

// Initial phase of the live session. The user picks a non-empty subset
// of the four composable modules; "Comenzar" is enabled only when at
// least one is selected. Visual style mirrors the previous live UI so
// returning users land on familiar layout, colors and motion.
export function DimensionSelector({
  selected,
  onToggle,
  onStart,
  isStartDisabled,
  isStarting = false,
  loudnessPresets,
  selectedLoudnessPresetId,
  onSelectLoudnessPreset,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-8 p-6 w-full max-w-md mx-auto animate-fade-in">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Sesión libre
        </p>
        <h1 className="text-3xl font-extrabold text-text">¿Qué entrenamos hoy?</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Habla con naturalidad. Evaluamos los módulos que selecciones sobre el mismo audio.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {LIVE_MODULES.map((module) => {
          const isActive = selected.includes(module)
          return (
            <button
              key={module}
              onClick={() => onToggle(module)}
              type="button"
              className={`
                flex items-center gap-4 w-full p-4 rounded-2xl border text-left transition-all duration-200 min-h-[44px]
                ${
                  isActive
                    ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'border-border/50 bg-surface/60 hover:border-border hover:bg-surface'
                }
              `}
            >
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${isActive ? 'bg-accent border-accent' : 'border-border'}
                `}
              >
                {isActive && (
                  <svg
                    className="w-3 h-3 text-text-on-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    viewBox="0 0 12 12"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2 6l3 3 5-5"
                    />
                  </svg>
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-semibold text-sm ${
                    isActive ? 'text-accent' : 'text-text'
                  }`}
                >
                  {LIVE_MODULE_LABELS[module]}
                </span>
                <span className="text-xs text-text-muted">
                  {LIVE_MODULE_DESCRIPTIONS[module]}
                </span>
              </div>
            </button>
          )
        })}

        {selected.includes('loudness') && (
          <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-surface/40 p-4 ml-9">
            <label
              htmlFor="live-loudness-preset"
              className="text-xs font-bold uppercase tracking-widest text-text-muted"
            >
              Preset de volumen
            </label>
            {loudnessPresets.length === 0 ? (
              <p className="text-xs text-text-muted">
                Cargando presets… si no aparecen, usaremos el preset global por defecto.
              </p>
            ) : (
              <select
                id="live-loudness-preset"
                value={selectedLoudnessPresetId ?? loudnessPresets[0]?.id ?? ''}
                onChange={(event) => onSelectLoudnessPreset(event.target.value)}
                className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm text-text min-h-[44px]"
              >
                {loudnessPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                    {preset.is_default ? ' (predeterminado)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={isStartDisabled || isStarting}
        type="button"
        className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-hover
                   py-4 font-extrabold text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)]
                   transition-all duration-300 active:scale-95 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]
                   disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed min-h-[44px]
                   inline-flex items-center justify-center gap-3"
      >
        {isStarting && (
          <span
            aria-hidden
            className="h-5 w-5 rounded-full border-2 border-text-on-accent/40 border-t-text-on-accent animate-spin"
          />
        )}
        {isStarting ? 'Preparando…' : 'Comenzar sesión libre'}
      </button>
    </div>
  )
}
