import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleGuideLauncher } from '../../../journey'
import { useGuidedVersatilitySession } from '../hooks/useGuidedVersatilitySession'
import { GuidedSessionView } from '../components/organisms/GuidedSessionView'
import { SessionResultsView } from '../components/organisms/SessionResultsView'
import type { RichnessScore } from '../../domain/LinguisticVersatility'

/**
 * Top-level page for linguistic versatility (guided mode only).
 *
 * The free-form ("habla libre") variant of this analysis lives inside the
 * Live Session module as the `lex` dimension — the user finds it there
 * alongside pronunciation, accentuation and the rest. This page keeps the
 * focused 3-question flow.
 *
 * Status-driven router around `useGuidedVersatilitySession`:
 *   - loading     → spinner
 *   - review      → GuidedSessionView (current question, recorder, feedback)
 *   - recording / uploading → handled by GuidedSessionView's button states
 *   - finalizing  → spinner
 *   - results     → SessionResultsView with overall score and per-round detail
 *   - error       → message + retry
 */
export function LinguisticVersatilityPage() {
  const navigate = useNavigate()
  const tracking = useGuidedVersatilitySession()

  // Auto-start the session on first mount: there's no longer a mode selector
  // gating it, so deferring the first call to a click would be redundant.
  useEffect(() => {
    if (tracking.status === 'idle') tracking.start()
    // tracking.start identity is stable; we intentionally exclude `tracking`
    // from deps so this effect runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="linguistic-versatility-intro">
  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
  <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
    <div>
      <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
      <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Versatilidad</h1>
      <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Mejora tu riqueza de vocabulario.</p>
    </div>
    <div className="shrink-0 mt-1">
      <ModuleGuideLauncher guideId="linguistic-versatility" />
    </div>
  </div>
</header>
      {(tracking.status === 'idle' || tracking.status === 'loading') && (
        <CenteredLoader text="Cargando preguntas…" />
      )}

      {tracking.status === 'finalizing' && (
        <CenteredLoader text="Calculando resultados…" />
      )}

      {tracking.status === 'error' && (
        <ErrorScreen
          message={tracking.error ?? 'Ocurrió un error.'}
          onRetry={() => {
            tracking.reset()
            navigate('/dashboard')
          }}
        />
      )}

      {tracking.status === 'results' && tracking.finalResult && (
        <div data-journey-id="versatility-results">
          
          <SessionResultsView
            overallScore={tracking.finalResult.overallScore}
            averageRichness={tracking.finalResult.vocabularyRichnessAvg}
            rounds={tracking.finalResult.rounds}
            onRestart={() => {
              tracking.reset()
              tracking.start()
            }}
            onExit={() => {
              tracking.reset()
              navigate('/dashboard')
            }}
          />
        </div>
      )}

      {(tracking.status === 'review' ||
        tracking.status === 'recording' ||
        tracking.status === 'uploading') &&
        tracking.currentQuestion && (
          <div className="flex h-full flex-col" data-journey-id="versatility-intro">
            <GuidedSessionView
              status={tracking.status}
              question={tracking.currentQuestion}
              index={tracking.currentIndex}
              total={tracking.questions.length}
              isLastQuestion={tracking.isLastQuestion}
              lastResult={tracking.lastResult}
              activeStream={tracking.activeStream}
              onStartRecording={tracking.startRecording}
              onStopAndUpload={tracking.stopAndUpload}
              onNext={tracking.next}
            />
          </div>
        )}
    </div>
  )
}

function CenteredLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-start h-full w-full gap-3 text-text-muted">
      <span className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm">{text}</p>
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
        Volver al inicio
      </button>
    </div>
  )
}

// vocabularyRichnessAvg now comes pre-aggregated from the backend's
// metrics row (avg of intelligible rounds), so the modal-richness helper
// the legacy 1/2/3 enum needed no longer applies. Keeping the unused
// type import out of the page so the module stays clean.
export type _RichnessTypeRef = RichnessScore
