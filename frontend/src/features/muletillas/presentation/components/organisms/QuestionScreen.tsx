import { ModuleGuideLauncher } from '../../../../journey'
import QuestionCard from '../molecules/QuestionCard'

type Props = {
  question: string
  onStartRecording: () => void
  onLoadNew: () => void
  isLoadingQuestion: boolean
}

export default function QuestionScreen({ question, onStartRecording, onLoadNew, isLoadingQuestion }: Props) {
  return (
    <div className="flex flex-col gap-6 relative z-10 w-full max-w-3xl mx-auto">
      <QuestionCard question={question} />

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onLoadNew}
          disabled={isLoadingQuestion}
          className="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-transparent border border-[#334155] text-[#9CA3AF] hover:border-amber-500 hover:text-amber-400 transition-colors duration-200 disabled:opacity-50"
        >
          Otra pregunta
        </button>
        <button
          onClick={onStartRecording}
          className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-gray-900 transition-colors duration-200"
        >
          Comenzar a grabar
        </button>
      </div>
    </div>
  )
}
