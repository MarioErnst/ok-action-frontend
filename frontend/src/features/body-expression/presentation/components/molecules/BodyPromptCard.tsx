type Props = {
  promptText: string
  isLoaded: boolean
  loadError: string | null
  onStart: () => void
  onNextPrompt: () => void
}

export function BodyPromptCard({
  promptText,
  isLoaded,
  loadError,
  onStart,
  onNextPrompt,
}: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/80 p-5 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">
          Consigna oral
        </span>
        <button
          type="button"
          onClick={onNextPrompt}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text"
        >
          Cambiar
        </button>
      </div>

      <p className="text-lg font-semibold leading-relaxed text-text">{promptText}</p>

      <p className="text-sm leading-relaxed text-text-muted">
        Responde de pie o sentado, con hombros y manos visibles. Se analiza postura,
        apertura, gestos, estabilidad, energia y encuadre; no se sube video al servidor.
      </p>

      {loadError && (
        <p className="rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!isLoaded}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoaded ? 'Iniciar medicion' : 'Cargando detector'}
      </button>
    </section>
  )
}
