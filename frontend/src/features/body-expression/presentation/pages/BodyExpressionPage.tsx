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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col gap-6 p-4 pb-28 pt-8 md:p-6 lg:pb-6">
      <section className="flex flex-col gap-4 text-center" data-journey-id="body-intro">
        <div className="flex justify-end">
          {(session.status === 'idle' || session.status === 'results' || session.status === 'error') && (
            <ModuleGuideLauncher guideId="body-expression" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Expresion corporal
          </p>
          <h1 className="text-3xl font-extrabold text-text">
            Evalua tu presencia mientras hablas
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-text-muted">
            Practica una respuesta oral con camara activa. El analisis se hace en tu
            navegador y solo se guardan metricas agregadas.
          </p>
        </div>
      </section>

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
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
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
    </main>
  )
}
