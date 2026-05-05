import type { AnalysisResult, LiveDim, LiveSessionPhase } from '../../../domain/LiveSession'
import { LiveFeedbackPanel } from '../molecules/LiveFeedbackPanel'

// Maximum session duration in seconds; progress bar fills to 100% at this point.
const MAX_SESSION_SECONDS = 300

interface Props {
  phase: LiveSessionPhase
  selectedDims: LiveDim[]
  latestAnalysis: AnalysisResult | null
  elapsedSeconds: number
  onEnd: () => void
}

export function LiveRecordingScreen({
  phase,
  selectedDims,
  latestAnalysis,
  elapsedSeconds,
  onEnd,
}: Props) {
  const progressPercent = Math.min((elapsedSeconds / MAX_SESSION_SECONDS) * 100, 100)
  const remainingSeconds = Math.max(0, MAX_SESSION_SECONDS - elapsedSeconds)
  const mins = Math.floor(remainingSeconds / 60)
  const secs = String(remainingSeconds % 60).padStart(2, '0')

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-md mx-auto min-h-screen pt-8 animate-fade-in">

      {/* Session progress bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span className="font-bold uppercase tracking-widest text-accent">Sesión libre</span>
          <span className="font-mono">{mins}:{secs} restantes</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Recording indicator */}
      <div className="flex flex-col items-center gap-3 py-2">
        {phase === 'connecting' ? (
          <div className="w-16 h-16 rounded-full border-4 border-border border-t-accent animate-spin" />
        ) : (
          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="absolute w-16 h-16 rounded-full bg-danger/20 animate-ping opacity-75" />
            <div className="w-10 h-10 rounded-full bg-danger shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
          </div>
        )}
        <p className="text-sm font-medium text-text-muted">
          {phase === 'connecting' ? 'Conectando...' : 'Escuchando...'}
        </p>
      </div>

      {/* Real-time feedback panel */}
      {latestAnalysis ? (
        <LiveFeedbackPanel
          analysis={latestAnalysis}
          selectedDims={selectedDims}
          elapsedSeconds={elapsedSeconds}
        />
      ) : (
        <div className="w-full rounded-2xl border border-border/40 bg-surface/40 backdrop-blur-sm p-6 text-center">
          <p className="text-sm text-text-muted">
            El análisis aparecerá aquí mientras hablas.
          </p>
        </div>
      )}

      {/* End session button */}
      <button
        onClick={onEnd}
        className="w-full py-4 rounded-2xl border border-border/60 bg-surface-alt/50 text-text-muted
                   font-medium hover:border-danger/50 hover:text-danger active:scale-95 transition-all duration-200"
      >
        Terminar sesión
      </button>

    </div>
  )
}
