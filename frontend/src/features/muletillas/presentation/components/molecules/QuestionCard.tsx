type Props = {
  question: string
}

export default function QuestionCard({ question }: Props) {
  return (
    <div className="bg-[#232B38] rounded-xl p-4 sm:p-6 border border-[#334155]">
      <p className="text-[#9CA3AF] text-xs sm:text-sm uppercase tracking-widest mb-2 sm:mb-3">
        Pregunta
      </p>
      <p className="text-[#F8FAFC] text-base sm:text-xl font-medium leading-relaxed">
        {question}
      </p>
    </div>
  )
}
