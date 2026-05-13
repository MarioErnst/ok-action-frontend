import { RecordingWaveform } from '../../../../../shared/ui/molecules/RecordingWaveform'
import QuestionCard from '../molecules/QuestionCard'

type Props = {
  question: string
  isRecording: boolean
  stream: MediaStream | null
  onStop: () => void
}

export default function RecordingScreen({ question, isRecording, stream, onStop }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-lg mx-auto px-4 sm:px-0">
      <div className="text-center">
        <h2 className="text-[#F8FAFC] text-xl sm:text-2xl font-bold mb-2">
          Grabando tu respuesta
        </h2>
        <p className="text-[#9CA3AF] text-sm sm:text-base">
          Responde la pregunta con naturalidad. Pulsa detener cuando termines.
        </p>
      </div>

      <QuestionCard question={question} />

      <div className="w-full">
        <RecordingWaveform stream={stream} active={isRecording} height={56} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-red-400 text-xs sm:text-sm font-medium">
          {isRecording ? 'Grabando...' : 'Iniciando microfono...'}
        </p>
      </div>

      <button
        onClick={onStop}
        disabled={!isRecording}
        className="w-full sm:w-auto py-3 px-8 rounded-xl text-sm font-bold bg-[#1C1C1E] border border-[#334155] text-[#F8FAFC] hover:border-amber-500 hover:text-amber-400 transition-colors duration-200 disabled:opacity-50"
      >
        Detener grabacion
      </button>
    </div>
  )
}
