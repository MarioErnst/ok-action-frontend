import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuidedVersatilitySession } from '../hooks/useGuidedVersatilitySession'
import { GuidedSessionView } from '../components/organisms/GuidedSessionView'
import { SessionResultsView } from '../components/organisms/SessionResultsView'
import type { RichnessLevel } from '../../domain/LinguisticVersatility'

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
    <div className="h-[100dvh] w-full bg-background overflow-hidden flex flex-col">
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
        <SessionResultsView
          overallScore={tracking.finalResult.overall_score}
          averageRichness={modalRichness(
            tracking.finalResult.rounds.map((r) => r.vocabulary_richness),
          )}
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
      )}

      {(tracking.status === 'review' ||
        tracking.status === 'recording' ||
        tracking.status === 'uploading') &&
        tracking.currentQuestion && (
          <GuidedSessionView
            status={tracking.status}
            question={tracking.currentQuestion}
            index={tracking.currentIndex}
            total={tracking.questions.length}
            isLastQuestion={tracking.isLastQuestion}
            lastResult={tracking.lastResult}
            onStartRecording={tracking.startRecording}
            onStopAndUpload={tracking.stopAndUpload}
            onNext={tracking.next}
          />
        )}
    </div>
  )
}

function CenteredLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-text-muted">
      <span className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto px-6 gap-4 text-center">
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

/**
 * Compute the modal richness across rounds — falls back to the highest tier
 * on a tie so users err on the optimistic side. Returns null if no
 * intelligible round exists.
 */
function modalRichness(values: Array<RichnessLevel | null>): RichnessLevel | null {
  const filtered = values.filter((v): v is RichnessLevel => v != null)
  if (filtered.length === 0) return null
  const counts: Record<number, number> = {}
  for (const v of filtered) counts[v] = (counts[v] ?? 0) + 1
  let bestLevel: RichnessLevel = filtered[0]
  let bestCount = 0
  for (const [level, count] of Object.entries(counts)) {
    const lvl = Number(level) as RichnessLevel
    if (count > bestCount || (count === bestCount && lvl > bestLevel)) {
      bestCount = count
      bestLevel = lvl
    }
  }
  return bestLevel
}
