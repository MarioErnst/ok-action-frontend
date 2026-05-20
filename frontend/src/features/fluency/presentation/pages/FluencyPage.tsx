import { ModuleGuideLauncher } from '../../../journey'
import { FluencyActivityStatus } from '../components/molecules/FluencyActivityStatus'
import { FluencyPromptCard } from '../components/molecules/FluencyPromptCard'
import { FluencyFeedbackPanel } from '../components/organisms/FluencyFeedbackPanel'
import { FluencyResultCard } from '../components/organisms/FluencyResultCard'
import { useFluencySession } from '../hooks/useFluencySession'

export default function FluencyPage() {
  const {
    phase,
    promptText,
    analyses,
    latestAnalysis,
    warningReason,
    elapsedSeconds,
    averageScore,
    error,
    nextPrompt,
    startSession,
    endSession,
    resetSession,
  } = useFluencySession()

  const isRecording = phase === 'recording'
  const isConnecting = phase === 'connecting'
  const isEnded = phase === 'ended'

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10 gap-6">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="fluency-intro">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Fluidez</h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Entrena respuestas sin trabarte.</p>
          </div>
          <div className="shrink-0 mt-1">
            <ModuleGuideLauncher guideId="fluency" />
          </div>
        </div>
      </header>

      <div data-journey-id="fluency-prompt">
        <FluencyPromptCard
          promptText={promptText}
          phase={phase}
          onNextPrompt={nextPrompt}
          onStartSession={startSession}
        />
      </div>

      {(isConnecting || isRecording) && (
        <FluencyActivityStatus
          phase={isConnecting ? 'connecting' : 'recording'}
          elapsedSeconds={elapsedSeconds}
          onEndSession={endSession}
        />
      )}

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-center text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <div data-journey-id="fluency-feedback">
        <FluencyFeedbackPanel analysis={latestAnalysis} warningReason={warningReason} />
      </div>

      {isEnded && (
        <FluencyResultCard
          averageScore={averageScore}
          analysisCount={analyses.length}
          onResetSession={resetSession}
        />
      )}
    </div>
  )
}

