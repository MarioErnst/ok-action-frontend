interface QuestionCardProps {
  questionNumber: number
  totalQuestions: number
  text: string
  category: string
}

export function QuestionCard({ questionNumber, totalQuestions, text, category }: QuestionCardProps) {
  return (
    <div className="bg-surface-alt rounded-xl p-4 sm:p-6 border border-border">
      <p className="text-text-muted text-xs sm:text-sm uppercase tracking-widest mb-2 sm:mb-3">
        Pregunta {questionNumber} de {totalQuestions} · {category}
      </p>
      <p className="text-text text-base sm:text-xl font-medium leading-relaxed">{text}</p>
    </div>
  )
}
