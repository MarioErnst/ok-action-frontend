import type { PronunciationLevel } from '../../types'

interface LevelCardProps {
  level: PronunciationLevel
  title: string
  description: string
  onSelect: (level: PronunciationLevel) => void
  index: number
}

function LevelCard({ level, title, description, onSelect, index }: LevelCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      style={{ animationDelay: `${index * 100}ms` }}
      className="group relative flex flex-col gap-2 rounded-3xl border border-border/60 bg-surface/60 backdrop-blur-sm p-8 text-left transition-all duration-300 hover:border-accent/60 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)] active:scale-95 overflow-hidden animate-fade-in"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative z-10 text-xl font-bold text-text group-hover:text-accent transition-colors">{title}</span>
      <span className="relative z-10 text-sm leading-relaxed text-text-muted mt-1">{description}</span>
    </button>
  )
}

interface LevelSelectionScreenProps {
  onLevelSelect: (level: PronunciationLevel) => void
}

export default function LevelSelectionScreen({ onLevelSelect }: LevelSelectionScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 p-6 pb-28 relative z-10">
      <div className="flex flex-col items-center gap-3 relative text-center">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-accent/20 blur-[60px] rounded-full pointer-events-none animate-pulse-glow" />
        <p className="text-xs font-bold uppercase tracking-widest text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">Evaluación de pronunciación</p>
        <p className="text-sm font-medium text-text-muted bg-surface-alt/50 px-4 py-2 rounded-full border border-white/5">Elige el nivel de dificultad para comenzar.</p>
      </div>
      <div className="flex flex-col gap-4">
        <LevelCard
          index={0}
          level="basico"
          title="Básico"
          description="Frases cortas con fonemas comunes. Ideal para comenzar."
          onSelect={onLevelSelect}
        />
        <LevelCard
          index={1}
          level="intermedio"
          title="Intermedio"
          description="Incluye vibrantes, fricativas y grupos consonánticos."
          onSelect={onLevelSelect}
        />
        <LevelCard
          index={2}
          level="avanzado"
          title="Avanzado"
          description="Palabras complejas y acumulación de fonemas difíciles."
          onSelect={onLevelSelect}
        />
      </div>
    </div>
  )
}
