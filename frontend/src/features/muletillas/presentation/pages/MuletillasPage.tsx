import { ModuleGuideLauncher } from '../../../journey';
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
    activeStream,
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="muletillas-intro">
  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
  <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
    <div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Muletillas</h1>
      <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Identifica palabras de relleno en tu discurso.</p>
    </div>
    <div className="shrink-0 mt-1">
      <ModuleGuideLauncher guideId="muletillas" />
    </div>
  </div>
</header>
      {/* Initial question loading */}
      {phase === 'idle' && isLoadingQuestion && (
        <div className="flex justify-start mt-4">
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
          stream={activeStream}
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
