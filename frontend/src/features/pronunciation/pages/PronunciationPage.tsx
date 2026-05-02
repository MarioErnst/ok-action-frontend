import { useEffect } from 'react'
import LevelSelectionScreen from '../components/organisms/LevelSelectionScreen'
import PronunciationResultsScreen from '../components/organisms/PronunciationResultsScreen'
import RecordingScreen from '../components/organisms/RecordingScreen'
import usePronunciationSession from '../hooks/usePronunciationSession'
import { useAuthStore } from '../../auth/presentation/store/authStore'

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
  const { user, updateUser } = useAuthStore()

  useEffect(() => {
    if (user && !user.completedExercises?.includes('pronunciacion')) {
      updateUser({
        completedExercises: [...(user.completedExercises || []), 'pronunciacion']
      })
    }
  }, [user, updateUser])

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
          onFinishPhrase={finishCurrentPhrase}
          onReset={resetSession}
        />
      )}
    </div>
  )
}
