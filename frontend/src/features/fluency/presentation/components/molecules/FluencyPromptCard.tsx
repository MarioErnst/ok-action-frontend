import type { FluencyPhase } from '../../../domain/FluencySession'

interface Props {
  promptText: string
  phase: FluencyPhase
  onNextPrompt: () => void
  onStartSession: () => void
}

export function FluencyPromptCard({ promptText, phase, onNextPrompt, onStartSession }: Props) {
  return (
    <section className="rounded-2xl border border-border/50 bg-surface/60 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Consigna</p>
      <p className="mt-2 text-lg font-semibold leading-relaxed text-text">{promptText}</p>

      {phase === 'idle' && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onNextPrompt}
            className="flex-1 rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm font-bold text-text-muted transition-colors hover:text-text"
          >
            Cambiar pregunta
          </button>
          <button
            type="button"
            onClick={onStartSession}
            className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-bg transition-transform active:scale-95"
          >
            Comenzar
          </button>
        </div>
      )}
    </section>
  )
}
