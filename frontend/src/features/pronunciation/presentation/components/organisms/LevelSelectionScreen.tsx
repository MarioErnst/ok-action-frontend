import type { PronunciationLevel } from '../../../domain/PronunciationSession'
import WeakestPhrasesCard from '../molecules/WeakestPhrasesCard'

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
    <div className="flex flex-col gap-8 relative z-10 w-full max-w-4xl mx-auto">
      <div className="grid gap-4 md:grid-cols-3">
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
      <WeakestPhrasesCard />
    </div>
  )
}
