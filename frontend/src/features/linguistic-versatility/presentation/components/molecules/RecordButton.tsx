import { RecordPulse } from '../atoms/RecordPulse'

type State = 'idle' | 'recording' | 'uploading'

type Props = {
  state: State
  onStart: () => void
  onStop: () => void
  // Disabled is separate from `uploading` because the page may want to gate
  // the button before the session is even loaded.
  disabled?: boolean
}

/**
 * The session's primary action: a single big button that flips between
 * "Iniciar grabación", "Detener" and a disabled "Enviando…" state.
 *
 * Why one button instead of two: avoids ambiguity about which control belongs
 * to the user's current intent. Touch target is large (~56px tall) so it
 * clears the 44x44 minimum on phones.
 */
export function RecordButton({ state, onStart, onStop, disabled }: Props) {
  if (state === 'recording') {
    return (
      <button
        type="button"
        onClick={onStop}
        disabled={disabled}
        className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <RecordPulse />
        Detener grabación
      </button>
    )
  }
  if (state === 'uploading') {
    return (
      <button
        type="button"
        disabled
        className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold bg-surface-alt text-text-muted cursor-not-allowed"
      >
        <span className="w-4 h-4 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
        Enviando audio…
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold bg-accent text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
    >
      <span className="w-3 h-3 rounded-full bg-white" aria-hidden />
      Iniciar grabación
    </button>
  )
}
