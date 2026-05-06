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
    noiseLevel,
    qaQuestion,
    qaLastResult,
    toggleDim,
    startSession,
    endSession,
    resetSession,
    sendAnswerDone,
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

  if (phase === 'ended' || phase === 'correction') {
    return (
      <SessionSummaryScreen
        analyses={analyses}
        selectedDims={selectedDims}
        stopReason={correction?.reason ?? stopReason}
        onReset={resetSession}
      />
    )
  }

  return (
    <LiveRecordingScreen
      phase={phase}
      selectedDims={selectedDims}
      latestAnalysis={latestAnalysis}
      elapsedSeconds={elapsedSeconds}
      noiseLevel={noiseLevel}
      qaQuestion={qaQuestion}
      qaLastResult={qaLastResult}
      onEnd={endSession}
      onAnswerDone={sendAnswerDone}
    />
  )
}
