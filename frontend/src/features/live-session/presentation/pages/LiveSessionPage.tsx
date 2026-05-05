import { DimensionSelector } from '../components/organisms/DimensionSelector'
import { LiveRecordingScreen } from '../components/organisms/LiveRecordingScreen'
import { useLiveSession } from '../hooks/useLiveSession'

export default function LiveSessionPage() {
  const {
    phase,
    selectedDims,
    latestAnalysis,
    correction,
    elapsedSeconds,
    stopReason,
    analyses,
    toggleDim,
    startSession,
    endSession,
    resetSession,
  } = useLiveSession()

  if (phase === 'idle') {
    return (
      <DimensionSelector
        selected={selectedDims}
        onToggle={toggleDim}
        onStart={startSession}
        isStartDisabled={selectedDims.length === 0}
      />
    )
  }

  if (phase === 'ended') {
    const avgScore =
      analyses.length > 0
        ? Math.round(analyses.reduce((sum, a) => sum + a.overall, 0) / analyses.length)
        : null

    return (
      <div className="flex flex-col items-center gap-8 p-6 w-full max-w-md mx-auto pt-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sesión completada</h1>
          <p className="text-gray-500 text-sm">
            {stopReason === 'time_limit'
              ? 'Se agotó el tiempo de la sesión.'
              : 'Terminaste la sesión.'}
          </p>
        </div>

        {avgScore !== null && (
          <div className="w-full rounded-2xl bg-blue-50 p-6 text-center">
            <p className="text-sm text-blue-600 font-medium mb-1">Puntuación promedio</p>
            <p className="text-4xl font-bold text-blue-700">{avgScore}</p>
            <p className="text-xs text-blue-500 mt-1">de {analyses.length} ciclo{analyses.length !== 1 ? 's' : ''} analizado{analyses.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        <button
          onClick={resetSession}
          className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 active:scale-95 transition-all"
        >
          Nueva sesión
        </button>
      </div>
    )
  }

  return (
    <LiveRecordingScreen
      phase={phase}
      selectedDims={selectedDims}
      latestAnalysis={latestAnalysis}
      correction={correction}
      elapsedSeconds={elapsedSeconds}
      onEnd={endSession}
      onReset={resetSession}
    />
  )
}
