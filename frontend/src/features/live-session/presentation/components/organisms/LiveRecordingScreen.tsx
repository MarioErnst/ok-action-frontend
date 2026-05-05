import type { AnalysisResult, CorrectionEvent, LiveDim, LiveSessionPhase } from '../../../domain/LiveSession'
import { LiveFeedbackPanel } from '../molecules/LiveFeedbackPanel'
import { CorrectionOverlay } from '../molecules/CorrectionOverlay'

// Maximum session duration in seconds; progress bar fills to 100% at this point.
const MAX_SESSION_SECONDS = 300

interface Props {
  phase: LiveSessionPhase
  selectedDims: LiveDim[]
  latestAnalysis: AnalysisResult | null
  correction: CorrectionEvent | null
  elapsedSeconds: number
  onEnd: () => void
  onReset: () => void
}

export function LiveRecordingScreen({
  phase,
  selectedDims,
  latestAnalysis,
  correction,
  elapsedSeconds,
  onEnd,
  onReset,
}: Props) {
  const progressPercent = Math.min((elapsedSeconds / MAX_SESSION_SECONDS) * 100, 100)
  const remainingSeconds = Math.max(0, MAX_SESSION_SECONDS - elapsedSeconds)

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-md mx-auto min-h-screen pt-8">
      {/* Session progress bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Sesión libre</span>
          <span>
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')} restantes
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Recording indicator — spinner while connecting, pulse dot while active */}
      <div className="flex flex-col items-center gap-3">
        {phase === 'connecting' ? (
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        ) : (
          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="absolute w-16 h-16 rounded-full bg-red-100 animate-ping opacity-75" />
            <div className="w-10 h-10 rounded-full bg-red-500" />
          </div>
        )}
        <p className="text-sm text-gray-500">
          {phase === 'connecting' ? 'Conectando...' : 'Escuchando...'}
        </p>
      </div>

      {/* Real-time feedback panel or placeholder before first analysis arrives */}
      {latestAnalysis ? (
        <LiveFeedbackPanel
          analysis={latestAnalysis}
          selectedDims={selectedDims}
          elapsedSeconds={elapsedSeconds}
        />
      ) : (
        <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-400">
            El análisis aparecerá aquí mientras hablas.
          </p>
        </div>
      )}

      {/* End session button */}
      <button
        onClick={onEnd}
        className="w-full py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-medium
                   hover:border-red-300 hover:text-red-600 active:scale-95 transition-all"
      >
        Terminar sesión
      </button>

      {/* Correction modal — shown when the session triggers a correction event */}
      {correction && (
        <CorrectionOverlay correction={correction} onContinue={onReset} />
      )}
    </div>
  )
}
