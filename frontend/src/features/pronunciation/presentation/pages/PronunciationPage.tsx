// Full module documentation: documentacion/modulos/pronunciacion.md
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
    activeStream,
    sessionResult,
    startSession,
    finishCurrentPhrase,
    resetSession,
  } = usePronunciationSession()

  return (
    <div className="flex-1 flex flex-col justify-center">
      {phase === 'idle' && <LevelSelectionScreen onLevelSelect={startSession} />}

      {phase === 'finished' && sessionResult && (
        <PronunciationResultsScreen result={sessionResult} onReset={resetSession} />
      )}

      {(phase === 'recording' || phase === 'processing') && (
        <RecordingScreen
          level={currentLevel}
          currentIndex={currentIndex}
          totalPhrases={totalPhrases}
          phraseStates={phraseStates}
          isRecording={isRecording}
          recordingError={recordingError}
          activeStream={activeStream}
          onFinishPhrase={finishCurrentPhrase}
          onReset={resetSession}
        />
      )}
    </div>
  )
}
