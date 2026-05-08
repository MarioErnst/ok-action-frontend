import { ConsistencyFeedbackPanel } from '../components/ConsistencyFeedbackPanel'
import { useConsistencySession } from '../hooks/useConsistencySession'

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 pb-28 pt-8 md:p-6 lg:pb-6">
      <section className="flex flex-col gap-2 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Consistencia</p>
        <h1 className="text-3xl font-extrabold text-text">Mantente estable del inicio al cierre</h1>
        <p className="text-sm leading-relaxed text-text-muted">
          Responde una consigna y revisa si tu ritmo, claridad, foco y seguridad se sostienen.
        </p>
      </section>

      <section className="rounded-2xl border border-border/50 bg-surface/60 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Consigna</p>
        <p className="mt-2 text-lg font-semibold leading-relaxed text-text">{promptText}</p>

        {phase === 'idle' && (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={nextPrompt}
              className="flex-1 rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm font-bold text-text-muted transition-colors hover:text-text"
            >
              Cambiar consigna
            </button>
            <button
              type="button"
              onClick={startSession}
              className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-bg transition-transform active:scale-95"
            >
              Comenzar
            </button>
          </div>
        )}
      </section>

      {(isConnecting || isRecording || isAnalyzing) && (
        <section className="flex flex-col items-center gap-4">
          {isRecording ? (
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute h-16 w-16 rounded-full bg-danger/20 opacity-75 animate-ping" />
              <div className="h-10 w-10 rounded-full bg-danger shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full border-4 border-border border-t-accent animate-spin" />
          )}
          <p className="text-sm font-semibold text-text-muted">
            {isConnecting && 'Conectando...'}
            {isRecording && `Escuchando ${formatTime(elapsedSeconds)}`}
            {isAnalyzing && 'Analizando intento...'}
          </p>
          {isRecording && (
            <button
              type="button"
              onClick={endSession}
              className="w-full rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm font-bold text-text-muted transition-colors hover:border-danger/50 hover:text-danger"
            >
              Terminar intento
            </button>
          )}
        </section>
      )}

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-center text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <ConsistencyFeedbackPanel analysis={analysis} warningReason={warningReason} />

      {isEnded && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-surface/60 p-5 text-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Resultado</p>
            <p className="mt-1 text-2xl font-black text-text">
              {finalScore !== null ? Math.round(finalScore) : '--'}
            </p>
          </div>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-bg transition-transform active:scale-95"
          >
            Repetir intento
          </button>
        </section>
      )}
    </main>
  )
}
