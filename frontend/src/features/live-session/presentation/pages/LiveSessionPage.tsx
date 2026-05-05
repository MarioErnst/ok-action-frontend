import { DimensionSelector } from '../components/organisms/DimensionSelector'
import { LiveRecordingScreen } from '../components/organisms/LiveRecordingScreen'
import { SessionSummaryScreen } from '../components/organisms/SessionSummaryScreen'
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
    return (
      <SessionSummaryScreen
        analyses={analyses}
        selectedDims={selectedDims}
        stopReason={stopReason}
        onReset={resetSession}
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
