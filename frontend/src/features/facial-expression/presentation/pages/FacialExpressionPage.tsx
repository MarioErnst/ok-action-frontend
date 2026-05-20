import { useNavigate } from 'react-router-dom'
import { ModuleGuideLauncher } from '../../../journey'
import { useEmotionTracking } from '../hooks/useEmotionTracking'
import { CalibrationView } from '../components/organisms/CalibrationView'
import { LiveDetectionView } from '../components/organisms/LiveDetectionView'
import { SessionResultsView } from '../components/organisms/SessionResultsView'

/**
 * Top-level page for facial expression analysis.
 *
 * The page is a thin status-driven router around `useEmotionTracking`:
 *  - idle    → intro card with "Iniciar análisis" button
 *  - live    → camera + HUD + stop button
 *  - saving  → spinner while POST /sessions completes
 *  - results → distribution + gestures + restart/exit buttons
 *  - error   → message + retry
 *
 * The page itself uses h-[100dvh] (not h-screen) so iOS Safari's collapsing
 * URL bar does not chop off the bottom action button.
 */
export function FacialExpressionPage() {
  const navigate = useNavigate()
  const tracking = useEmotionTracking()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="facial-expression-intro">
  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
  <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
    <div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Expresión Facial</h1>
      <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Analiza tus gestos y emociones.</p>
    </div>
    <div className="shrink-0 mt-1">
      <ModuleGuideLauncher guideId="facial-expression" />
    </div>
  </div>
</header>
      {tracking.status === 'idle' && (
        <IntroScreen
          isLoaded={tracking.isLoaded}
          loadError={tracking.cameraError}
          onStart={tracking.startTracking}
        />
      )}

      {tracking.status === 'calibrating' && (
        <CalibrationView
          videoRef={tracking.videoRef}
          isCameraActive={tracking.isCameraActive}
          progress={tracking.calibrationProgress}
          setLandmarksCallback={tracking.setLandmarksCallback}
          attachStream={tracking.attachStream}
        />
      )}

      {(tracking.status === 'live' || tracking.status === 'saving') && (
        <LiveDetectionView
          videoRef={tracking.videoRef}
          isCameraActive={tracking.isCameraActive}
          detection={tracking.detection}
          elapsedMs={tracking.elapsedMs}
          setLandmarksCallback={tracking.setLandmarksCallback}
          attachStream={tracking.attachStream}
          onStop={tracking.stopTracking}
        />
      )}

      {tracking.status === 'saving' && (
        <SavingOverlay />
      )}

      {tracking.status === 'results' && tracking.result && (
        <div data-journey-id="facial-results">
          
          <SessionResultsView
            result={tracking.result}
            onRestart={() => {
              tracking.reset()
              tracking.startTracking()
            }}
            onExit={() => {
              tracking.reset()
              navigate('/dashboard')
            }}
          />
        </div>
      )}

      {tracking.status === 'error' && (
        <ErrorScreen
          message={tracking.error ?? tracking.cameraError ?? 'Ocurrió un error.'}
          onRetry={tracking.reset}
        />
      )}
    </div>
  )
}

/* --------------------------- Sub-screens --------------------------- */

function IntroScreen({
  isLoaded,
  loadError,
  onStart,
}: {
  isLoaded: boolean
  loadError: string | null
  onStart: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-start h-full w-full max-w-md mx-auto px-6 gap-6 text-center" data-journey-id="facial-intro">
      
      {/* Stylized face placeholder built with concentric rings — no emoji. */}
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 blur-xl" />
        <svg viewBox="0 0 100 100" className="relative w-full h-full text-accent">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* Eyes and mouth as minimal traces. */}
          <circle cx="42" cy="46" r="1.5" fill="currentColor" />
          <circle cx="58" cy="46" r="1.5" fill="currentColor" />
          <path d="M 42 56 Q 50 62 58 56" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold text-text">
          Análisis facial en tiempo real
        </h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Detectaremos tus emociones y gestos mientras te filmás. La cámara se
          activa solo durante la sesión y nunca se sube ningún video al
          servidor.
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-red-400 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
          {loadError}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!isLoaded}
        className="w-full max-w-xs py-4 rounded-2xl text-base font-semibold bg-accent text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isLoaded ? 'Iniciar análisis' : 'Cargando detector…'}
      </button>
    </div>
  )
}

function SavingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-start bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm text-text-muted">Guardando sesión…</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-start h-full w-full max-w-md mx-auto px-6 gap-4 text-center">
      <p className="text-base text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="w-full max-w-xs py-3 rounded-xl text-sm font-semibold bg-surface-alt text-text active:bg-surface transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
