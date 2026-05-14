// Full module documentation: documentacion/modulos/precision.md
import { ModuleGuideLauncher } from '../../../journey'
import { usePrecisionSession } from '../hooks/usePrecisionSession'
import { RecordAnswerScreen } from '../components/organisms/RecordAnswerScreen'
import { RoundResultScreen } from '../components/organisms/RoundResultScreen'
import { SessionSummaryScreen } from '../components/organisms/SessionSummaryScreen'

export function PrecisionPage() {
  const {
    phase, currentQuestion, currentQuestionIndex, questions,
    rounds, overallScore, errorMessage, noiseLevel, elapsedSeconds,
    isLastRound, activeStream,
    startSession, startRecordingAnswer, stopAndEvaluate,
    nextQuestion, retryRecording, retry, reset,
  } = usePrecisionSession()

  if (phase === 'IDLE') {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 sm:p-6 pb-28 lg:pb-6 animate-fade-in" data-journey-id="precision-intro">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-text">Precision</h1>
          <ModuleGuideLauncher guideId="precision" />
        </div>
        <p className="text-text-muted text-sm leading-relaxed">
          Responde preguntas en voz alta. El sistema evalua que tan directo, relevante y conciso eres en tu comunicacion.
        </p>
        <button
          onClick={() => startSession(5)}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all duration-300"
        >
          COMENZAR SESION
        </button>
      </div>
    )
  }

  if (phase === 'LOADING_SESSION' || phase === 'EVALUATING') {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 p-6 h-64">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-text-muted text-sm">
          {phase === 'LOADING_SESSION' ? 'Preparando sesion...' : 'Evaluando respuesta...'}
        </p>
      </div>
    )
  }

  if (phase === 'ERROR') {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6 animate-fade-in">
        <p className="text-danger text-sm">{errorMessage ?? 'Ocurrio un error inesperado.'}</p>
        <button onClick={retry} className="rounded-2xl border border-border bg-surface-alt px-6 py-3 text-sm font-semibold text-text active:scale-95">
          Reintentar
        </button>
      </div>
    )
  }

  if (phase === 'ASKING' || phase === 'RECORDING') {
    if (!currentQuestion) return null
    return (
      <RecordAnswerScreen
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        isRecording={phase === 'RECORDING'}
        activeStream={activeStream}
        elapsedSeconds={elapsedSeconds}
        noiseLevel={noiseLevel}
        onStartRecording={startRecordingAnswer}
        onStopRecording={stopAndEvaluate}
      />
    )
  }

  if (phase === 'ROUND_RESULT' || phase === 'UNINTELLIGIBLE') {
    const lastRound = rounds[rounds.length - 1]
    return (
      <RoundResultScreen
        round={lastRound}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        isLastRound={isLastRound}
        onNext={nextQuestion}
        onRetry={retryRecording}
      />
    )
  }

  if (phase === 'COMPLETED') {
    return (
      <div data-journey-id="precision-results">
        <div className="mx-auto flex w-full max-w-lg justify-end px-4 pt-4 sm:px-6">
          <ModuleGuideLauncher guideId="precision" />
        </div>
        <SessionSummaryScreen
          overallScore={overallScore}
          rounds={rounds}
          onNewSession={reset}
        />
      </div>
    )
  }

  return null
}

