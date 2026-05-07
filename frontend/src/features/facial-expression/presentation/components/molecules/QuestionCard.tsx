type QuestionCardProps = {
  text: string
  index: number
  total: number
  isRecording: boolean
}

export function QuestionCard({ text, index, total, isRecording }: QuestionCardProps) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-2">
        Pregunta {index + 1} de {total}
      </p>
      <p className="text-text text-base leading-relaxed">{text}</p>
      {isRecording && (
        <p className="text-xs text-accent mt-3">Respondiendo...</p>
      )}
    </div>
  )
}
