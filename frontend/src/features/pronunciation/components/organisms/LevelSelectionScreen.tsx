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
      onClick={() => onSelect(level)}
      className="flex flex-col gap-2 rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-95"
    >
      <span className="text-lg font-semibold text-gray-900">{title}</span>
      <span className="text-sm text-gray-500">{description}</span>
    </button>
  )
}

interface LevelSelectionScreenProps {
  onLevelSelect: (level: PronunciationLevel) => void
}

export default function LevelSelectionScreen({ onLevelSelect }: LevelSelectionScreenProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pronunciacion</h2>
        <p className="mt-1 text-gray-500">Elige el nivel de dificultad para comenzar.</p>
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
