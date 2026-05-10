import { useNavigate } from 'react-router-dom'

import { DimensionSelector } from '../components/organisms/DimensionSelector'
import { LiveRecordingScreen } from '../components/organisms/LiveRecordingScreen'
import { SessionSummaryScreen } from '../components/organisms/SessionSummaryScreen'
import { useLiveSession } from '../hooks/useLiveSession'

// Page-level orchestrator. The page itself has no state; it picks which
// organism to render based on the live session phase managed by
// useLiveSession. Errors render an inline retry surface so the user is
// not stuck without context.
export default function LiveSessionPage() {
  const navigate = useNavigate()
  const live = useLiveSession()

  if (live.phase === 'selection') {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center justify-center px-4 py-8">
        <DimensionSelector
          selected={live.selectedModules}
          onToggle={live.toggleModule}
          onStart={() => {
            void live.start()
          }}
          isStartDisabled={live.selectedModules.length === 0}
        />
        {live.error && <ErrorBanner message={live.error} />}
      </main>
    )
  }

  if (live.phase === 'recording' || live.phase === 'evaluating') {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center px-4">
        <LiveRecordingScreen
          phase={live.phase}
          selectedModules={live.selectedModules}
          elapsedSeconds={live.elapsedSeconds}
          onEnd={() => {
            void live.stop()
          }}
        />
      </main>
    )
  }

  if (live.phase === 'summary' && live.evaluation) {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center px-4">
        <SessionSummaryScreen
          evaluation={live.evaluation}
          selectedModules={live.selectedModules}
          liveScore={live.liveScore}
          onNewSession={live.reset}
          onGoToDashboard={() => navigate('/dashboard')}
        />
      </main>
    )
  }

  // Either phase is 'error', or 'summary' arrived without an evaluation
  // (which we treat as the same end state — no data to display).
  return (
    <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center justify-center px-6 text-center gap-6">
      <h1 className="text-2xl font-extrabold text-text">Algo salió mal</h1>
      <p className="text-sm text-text-muted max-w-md">
        {live.error ?? 'No se pudo completar la sesión.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={live.reset}
          className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold
                     text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95
                     transition-all duration-300 min-h-[44px]"
        >
          Volver a intentar
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4
                     hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
        >
          Volver al inicio
        </button>
      </div>
    </main>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-6 max-w-md w-full rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-center">
      <p className="text-sm text-danger">{message}</p>
    </div>
  )
}
