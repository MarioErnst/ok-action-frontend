import { ModuleGuideLauncher } from '../../../journey'
import { ConsistencyActivityStatus } from '../components/molecules/ConsistencyActivityStatus'
import { ConsistencyPromptCard } from '../components/molecules/ConsistencyPromptCard'
import { ConsistencyFeedbackPanel } from '../components/organisms/ConsistencyFeedbackPanel'
import { ConsistencyResultCard } from '../components/organisms/ConsistencyResultCard'
import { useConsistencySession } from '../hooks/useConsistencySession'

export default function ConsistencyPage() {
  const {
    phase,
    promptText,
    analysis,
    warningReason,
    elapsedSeconds,
    finalScore,
    error,
    nextPrompt,
    startSession,
    endSession,
    resetSession,
  } = useConsistencySession()

  const isRecording = phase === 'recording'
  const isConnecting = phase === 'connecting'
  const isAnalyzing = phase === 'analyzing'
  const isEnded = phase === 'ended'

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-6 p-4 pb-28 pt-8 md:p-6 lg:pb-6">
      <section className="flex flex-col gap-4 text-center" data-journey-id="consistency-intro">
        <div className="flex justify-end">
          {(phase === 'idle' || isEnded) && <ModuleGuideLauncher guideId="consistency" />}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Consistencia</p>
          <h1 className="text-3xl font-extrabold text-text">Mantente estable del inicio al cierre</h1>
          <p className="text-sm leading-relaxed text-text-muted">
            Responde una consigna y revisa si tu ritmo, claridad, foco y seguridad se sostienen.
          </p>
        </div>
      </section>

      <div data-journey-id="consistency-prompt">
        <ConsistencyPromptCard
          promptText={promptText}
          phase={phase}
          onNextPrompt={nextPrompt}
          onStartSession={startSession}
        />
      </div>

      {(isConnecting || isRecording || isAnalyzing) && (
        <ConsistencyActivityStatus
          phase={isConnecting ? 'connecting' : isRecording ? 'recording' : 'analyzing'}
          elapsedSeconds={elapsedSeconds}
          onEndSession={endSession}
        />
      )}

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-center text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <div data-journey-id="consistency-feedback">
        <ConsistencyFeedbackPanel analysis={analysis} warningReason={warningReason} />
      </div>

      {isEnded && (
        <ConsistencyResultCard finalScore={finalScore} onResetSession={resetSession} />
      )}
    </main>
  )
}
