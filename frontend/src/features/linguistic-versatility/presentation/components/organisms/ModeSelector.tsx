type Mode = 'guided' | 'free'

type Props = {
  onSelect: (mode: Mode) => void
}

/**
 * Initial card asking the user to pick between guided (3 predefined questions)
 * and free (one open recording). Both options are presented as equal-weight
 * cards stacked on mobile and laid out side-by-side from `sm:` upward.
 *
 * Each card has its own gradient and an aria-label so screen readers announce
 * the two distinct paths.
 */
export function ModeSelector({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-3xl mx-auto px-6 gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          Versatilidad lingüística
        </h1>
        <p className="text-sm text-text-muted leading-relaxed max-w-xl">
          Evaluamos qué tan variado es tu vocabulario y te damos un feedback concreto. Elegí cómo querés practicar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <ModeCard
          title="Guiado"
          description="Te hacemos 3 preguntas y vas respondiendo una por una. Recibís feedback de cada respuesta y un puntaje final."
          cta="Modo guiado"
          gradient="from-accent/30 to-accent/5"
          accentClass="text-accent"
          onClick={() => onSelect('guided')}
        />
        <ModeCard
          title="Libre"
          description="Hablás de lo que quieras todo el tiempo que necesites. Al detener, evaluamos toda tu intervención."
          cta="Modo libre"
          gradient="from-sky-500/30 to-sky-500/5"
          accentClass="text-sky-300"
          onClick={() => onSelect('free')}
        />
      </div>
    </div>
  )
}

function ModeCard({
  title,
  description,
  cta,
  gradient,
  accentClass,
  onClick,
}: {
  title: string
  description: string
  cta: string
  gradient: string
  accentClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left group relative overflow-hidden rounded-3xl border border-border/60 bg-surface/85 backdrop-blur-md p-6 flex flex-col gap-3 transition-all hover:border-border active:scale-[0.98]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 group-hover:opacity-90 transition-opacity`} />
      <div className="relative flex flex-col gap-3">
        <span className={`text-xs uppercase tracking-widest ${accentClass}`}>{title}</span>
        <p className="text-sm text-text leading-relaxed">{description}</p>
        <span className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${accentClass}`}>
          {cta} →
        </span>
      </div>
    </button>
  )
}
