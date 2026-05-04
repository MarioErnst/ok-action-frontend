// Full module documentation: documentacion/modulos/muletillas.md
import { useEffect } from 'react'
import useMuletillasSession from '../hooks/useMuletillasSession'
import QuestionScreen from '../components/organisms/QuestionScreen'
import RecordingScreen from '../components/organisms/RecordingScreen'
import MuletillasResults from '../components/organisms/MuletillasResults'

export default function MuletillasPage() {
  const {
    phase,
    question,
    isLoadingQuestion,
    isRecording,
    evaluationResult,
    evaluationError,
    loadQuestion,
    startRecordingResponse,
    stopAndEvaluate,
    resetSession,
  } = useMuletillasSession()

  // Load question automatically on first entry
  useEffect(() => {
    if (phase === 'idle') {
      loadQuestion()
    }
  }, [phase, loadQuestion])

  return (
    <div className="flex-1 flex flex-col justify-center py-6 sm:py-8">
      {/* Initial question loading */}
      {phase === 'idle' && isLoadingQuestion && (
        <div className="flex justify-center">
          <p className="text-[#9CA3AF] text-sm">Cargando pregunta...</p>
        </div>
      )}

      {/* Question ready for the user to answer */}
      {phase === 'question' && (
        <QuestionScreen
          question={question}
          onStartRecording={startRecordingResponse}
          onLoadNew={loadQuestion}
          isLoadingQuestion={isLoadingQuestion}
        />
      )}

      {/* Active recording */}
      {phase === 'recording' && (
        <RecordingScreen
          question={question}
          isRecording={isRecording}
          onStop={stopAndEvaluate}
        />
      )}

      {/* Processing with Gemini */}
      {phase === 'evaluating' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#9CA3AF] text-sm">Analizando tu respuesta...</p>
        </div>
      )}

      {/* Evaluation results */}
      {phase === 'results' && evaluationResult && (
        <MuletillasResults
          result={evaluationResult}
          questionText={question}
          onReset={resetSession}
        />
      )}

      {/* Error shown to the user */}
      {evaluationError && (
        <div className="mt-4 bg-red-400/10 border border-red-400/30 rounded-xl p-4 max-w-lg mx-auto w-full">
          <p className="text-red-400 text-sm text-center">{evaluationError}</p>
        </div>
      )}
    </div>
  )
}
