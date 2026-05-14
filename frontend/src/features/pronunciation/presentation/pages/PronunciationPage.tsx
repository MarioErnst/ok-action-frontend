// Full module documentation: documentacion/modulos/pronunciacion.md
import { ModuleGuideLauncher } from '../../../journey';
import LevelSelectionScreen from '../components/organisms/LevelSelectionScreen'
import PronunciationResultsScreen from '../components/organisms/PronunciationResultsScreen'
import RecordingScreen from '../components/organisms/RecordingScreen'
import usePronunciationSession from '../hooks/usePronunciationSession'

const GuideHeader = ({ anchorId }: { anchorId: string }) => (
  <div className="mx-auto flex w-full max-w-lg justify-end px-6 pt-4" data-journey-id={anchorId}>
    <ModuleGuideLauncher guideId="pronunciation" />
  </div>
);

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
    catalogError,
    sessionResult,
    startSession,
    finishCurrentPhrase,
    resetSession,
  } = usePronunciationSession()

  return (
    <div className="flex-1 flex flex-col justify-center">
      {phase === 'idle' && (
        <div className="flex flex-col gap-3" data-journey-id="pronunciation-levels">
          <GuideHeader anchorId="pronunciation-levels" />
          <LevelSelectionScreen onLevelSelect={startSession} />
          {catalogError && (
            <p className="text-center text-sm text-danger px-4">{catalogError}</p>
          )}
        </div>
      )}

      {phase === 'loading' && (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full border-4 border-surface-alt border-t-accent animate-spin" />
          <p className="text-sm text-text-muted">Cargando frases...</p>
        </div>
      )}

      {phase === 'finished' && sessionResult && (
        <div data-journey-id="pronunciation-results">
          <GuideHeader anchorId="pronunciation-results" />
          <PronunciationResultsScreen result={sessionResult} onReset={resetSession} />
        </div>
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

