// Full module documentation: documentacion/modulos/pronunciacion.md
import { ModuleGuideLauncher } from '../../../journey';
import LevelSelectionScreen from '../components/organisms/LevelSelectionScreen'
import PronunciationResultsScreen from '../components/organisms/PronunciationResultsScreen'
import RecordingScreen from '../components/organisms/RecordingScreen'
import usePronunciationSession from '../hooks/usePronunciationSession'

const GuideHeader = ({ anchorId }: { anchorId: string }) => (
  <div className="mx-auto flex w-full max-w-lg justify-end px-6 pt-4" data-journey-id={anchorId}>
    
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="pronunciation-intro">
  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
  <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
    <div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Pronunciación</h1>
      <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Practica y evalúa tu pronunciación.</p>
    </div>
    <div className="shrink-0 mt-1">
      <ModuleGuideLauncher guideId="pronunciation" />
    </div>
  </div>
</header>
      
      {phase === 'idle' && (
        <div className="flex flex-col gap-3" data-journey-id="pronunciation-levels">
          
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

