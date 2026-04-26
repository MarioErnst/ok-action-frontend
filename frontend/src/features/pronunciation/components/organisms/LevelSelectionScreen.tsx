import type { PronunciationLevel } from '../../types'

interface LevelCardProps {
  level: PronunciationLevel
  title: string
  description: string
  onSelect: (level: PronunciationLevel) => void
}

function LevelCard({ level, title, description, onSelect }: LevelCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-6 text-left transition-all hover:border-accent active:scale-95"
    >
      <span className="text-lg font-semibold text-text">{title}</span>
      <span className="text-sm text-text-muted">{description}</span>
    </button>
  )
}

interface LevelSelectionScreenProps {
  onLevelSelect: (level: PronunciationLevel) => void
}

export default function LevelSelectionScreen({ onLevelSelect }: LevelSelectionScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-wider text-text-muted">Evaluacion de pronunciacion</p>
        <p className="text-center text-sm text-text-muted">Elige el nivel de dificultad para comenzar.</p>
      </div>
      <div className="flex flex-col gap-4">
        <LevelCard
          level="basico"
          title="Basico"
          description="Frases cortas con fonemas comunes. Ideal para comenzar."
          onSelect={onLevelSelect}
        />
        <LevelCard
          level="intermedio"
          title="Intermedio"
          description="Incluye vibrantes, fricativas y grupos consonanticos."
          onSelect={onLevelSelect}
        />
        <LevelCard
          level="avanzado"
          title="Avanzado"
          description="Palabras complejas y acumulacion de fonemas dificiles."
          onSelect={onLevelSelect}
        />
      </div>
    </div>
  )
}
