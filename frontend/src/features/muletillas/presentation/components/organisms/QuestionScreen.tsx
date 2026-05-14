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
    <div className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-lg mx-auto px-4 sm:px-0 animate-[fade-in_0.4s_ease-out]">
      <div className="flex w-full justify-end" data-journey-id="muletillas-question">
        <ModuleGuideLauncher guideId="muletillas" />
      </div>

      <div className="text-center">
        <h2 className="text-[#F8FAFC] text-xl sm:text-2xl font-bold mb-2">
          Evaluacion de Muletillas
        </h2>
        <p className="text-[#9CA3AF] text-sm sm:text-base">
          Lee la pregunta y graba tu respuesta hablando con naturalidad.
        </p>
      </div>

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
