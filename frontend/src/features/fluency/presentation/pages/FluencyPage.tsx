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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-6 p-4 pb-28 pt-8 md:p-6 lg:pb-6">
      <section className="flex flex-col gap-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Fluidez</p>
        <h1 className="text-3xl font-extrabold text-text">Entrena respuestas sin trabarte</h1>
        <p className="text-sm leading-relaxed text-text-muted">
          Responde la consigna hablando con naturalidad. Analizamos continuidad, ritmo y concordancia con lo pedido.
        </p>
      </section>

      <FluencyPromptCard
        promptText={promptText}
        phase={phase}
        onNextPrompt={nextPrompt}
        onStartSession={startSession}
      />

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

      <FluencyFeedbackPanel analysis={latestAnalysis} warningReason={warningReason} />

      {isEnded && (
        <FluencyResultCard
          averageScore={averageScore}
          analysisCount={analyses.length}
          onResetSession={resetSession}
        />
      )}
    </main>
  )
}

