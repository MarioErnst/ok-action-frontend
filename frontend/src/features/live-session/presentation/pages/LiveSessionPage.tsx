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
