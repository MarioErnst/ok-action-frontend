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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="precision-intro">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Precisión</h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Evalúa la claridad y foco de tus respuestas.</p>
          </div>
          <div className="shrink-0 mt-1">
            <ModuleGuideLauncher guideId="precision" />
          </div>
        </div>
      </header>

      {phase === 'IDLE' && (
        <div className="max-w-3xl">
          <button
            onClick={() => startSession(5)}
            className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-hover px-8 py-4 font-extrabold text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all duration-300"
          >
            COMENZAR SESIÓN
          </button>
        </div>
      )}

      {(phase === 'LOADING_SESSION' || phase === 'EVALUATING') && (
        <div className="flex w-full max-w-3xl flex-col items-start mt-4 gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">
            {phase === 'LOADING_SESSION' ? 'Preparando sesión...' : 'Evaluando respuesta...'}
          </p>
        </div>
      )}

      {phase === 'ERROR' && (
        <div className="flex w-full max-w-3xl flex-col items-start gap-4 animate-fade-in">
          <p className="text-danger text-sm">{errorMessage ?? 'Ocurrió un error inesperado.'}</p>
          <button onClick={retry} className="rounded-2xl border border-border bg-surface-alt px-6 py-3 text-sm font-semibold text-text active:scale-95">
            Reintentar
          </button>
        </div>
      )}

      {(phase === 'ASKING' || phase === 'RECORDING') && currentQuestion && (
        <div className="flex w-full max-w-3xl flex-col items-start">
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
        </div>
      )}

      {(phase === 'ROUND_RESULT' || phase === 'UNINTELLIGIBLE') && (
        <div className="flex w-full max-w-3xl flex-col items-start">
          <RoundResultScreen
            round={rounds[rounds.length - 1]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            isLastRound={isLastRound}
            onNext={nextQuestion}
            onRetry={retryRecording}
          />
        </div>
      )}

      {phase === 'COMPLETED' && (
        <div className="flex w-full max-w-3xl flex-col items-start" data-journey-id="precision-results">
          <SessionSummaryScreen
            overallScore={overallScore}
            rounds={rounds}
            onNewSession={reset}
          />
        </div>
      )}
    </div>
  )
}

