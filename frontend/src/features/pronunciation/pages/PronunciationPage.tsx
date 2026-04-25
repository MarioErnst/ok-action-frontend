import LevelSelectionScreen from '../components/organisms/LevelSelectionScreen'
import PronunciationResultsScreen from '../components/organisms/PronunciationResultsScreen'
import RecordingScreen from '../components/organisms/RecordingScreen'
import usePronunciationSession from '../hooks/usePronunciationSession'

export default function PronunciationPage() {
  const {
    phase,
    currentLevel,
    currentIndex,
    totalPhrases,
    phraseStates,
    isRecording,
    recordingError,
    sessionResult,
    startSession,
    finishCurrentPhrase,
    resetSession,
  } = usePronunciationSession()

  if (phase === 'idle') {
    return <LevelSelectionScreen onLevelSelect={startSession} />
  }

  if (phase === 'finished' && sessionResult) {
    return <PronunciationResultsScreen result={sessionResult} onReset={resetSession} />
  }

  return (
    <RecordingScreen
      level={currentLevel}
      currentIndex={currentIndex}
      totalPhrases={totalPhrases}
      phraseStates={phraseStates}
      isRecording={isRecording}
      recordingError={recordingError}
      onFinishPhrase={finishCurrentPhrase}
      onReset={resetSession}
    />
  )
}
