import { useNavigate } from 'react-router-dom'
import { ModuleGuideLauncher } from '../../../journey'
import { BodyPromptCard } from '../components/molecules/BodyPromptCard'
import { BodyCalibrationView } from '../components/organisms/BodyCalibrationView'
import { BodyLiveSessionView } from '../components/organisms/BodyLiveSessionView'
import { BodyResultsView } from '../components/organisms/BodyResultsView'
import { useBodyExpressionSession } from '../hooks/useBodyExpressionSession'

export function BodyExpressionPage() {
  const navigate = useNavigate()
  const session = useBodyExpressionSession()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10 gap-6">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="body-expression-intro">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Expresión Corporal</h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Evalúa tu presencia mientras hablas.</p>
          </div>
          <div className="shrink-0 mt-1">
            <ModuleGuideLauncher guideId="body-expression" />
          </div>
        </div>
      </header>

      {session.status === 'idle' && (
        <BodyPromptCard
          promptText={session.promptText}
          isLoaded={session.isLoaded}
          loadError={session.cameraError}
          onStart={session.startSession}
          onNextPrompt={session.nextPrompt}
        />
      )}

      {session.status === 'calibrating' && (
        <BodyCalibrationView
          videoRef={session.videoRef}
          isCameraActive={session.isCameraActive}
          progress={session.calibrationProgress}
          setLandmarksCallback={session.setLandmarksCallback}
          attachStream={session.attachStream}
        />
      )}

      {(session.status === 'live' || session.status === 'saving') && (
        <BodyLiveSessionView
          videoRef={session.videoRef}
          isCameraActive={session.isCameraActive}
          promptText={session.promptText}
          elapsedMs={session.elapsedMs}
          liveMetrics={session.liveMetrics}
          setLandmarksCallback={session.setLandmarksCallback}
          attachStream={session.attachStream}
          onStop={session.stopSession}
        />
      )}

      {session.status === 'saving' && (
        <div className="fixed inset-0 z-20 flex items-center justify-start bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm font-semibold text-text-muted">Guardando y generando feedback</p>
          </div>
        </div>
      )}

      {session.status === 'results' && session.result && (
        <div data-journey-id="body-results">
          <BodyResultsView
            result={session.result}
            onRestart={() => {
              session.resetSession()
              session.startSession()
            }}
            onExit={() => {
              session.resetSession()
              navigate('/dashboard')
            }}
          />
        </div>
      )}

      {session.status === 'error' && (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-red-400/40 bg-red-400/10 p-5 text-center">
          <p className="text-sm font-semibold text-red-300">
            {session.error ?? session.cameraError ?? 'No se pudo iniciar la medicion.'}
          </p>
          <button
            type="button"
            onClick={session.resetSession}
            className="w-full rounded-xl bg-surface-alt px-4 py-3 text-sm font-bold text-text transition-colors hover:bg-surface"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
