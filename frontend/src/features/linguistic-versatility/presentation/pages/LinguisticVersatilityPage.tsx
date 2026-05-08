import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuidedVersatilitySession } from '../hooks/useGuidedVersatilitySession'
import { useFreeVersatilitySession } from '../hooks/useFreeVersatilitySession'
import { ModeSelector } from '../components/organisms/ModeSelector'
import { GuidedSessionView } from '../components/organisms/GuidedSessionView'
import { FreeSessionView } from '../components/organisms/FreeSessionView'
import { SessionResultsView } from '../components/organisms/SessionResultsView'
import { FeedbackPanel } from '../components/molecules/FeedbackPanel'
import type { RichnessLevel } from '../../domain/LinguisticVersatility'

type Mode = 'guided' | 'free' | null

/**
 * Top-level page for linguistic versatility.
 *
 * Three top-level states orchestrated locally:
 *   - mode === null         → ModeSelector (initial choice)
 *   - mode === 'guided'     → guided flow driven by useGuidedVersatilitySession
 *   - mode === 'free'       → free flow driven by useFreeVersatilitySession
 *
 * Each mode owns its hook so leaving and re-entering the page resets the
 * micro-state cleanly. h-[100dvh] keeps the layout stable on iOS Safari.
 */
export function LinguisticVersatilityPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(null)

  return (
    <div className="h-[100dvh] w-full bg-background overflow-hidden flex flex-col">
      {mode === null && <ModeSelector onSelect={setMode} />}
      {mode === 'guided' && <GuidedFlow onExit={() => setMode(null)} navigate={navigate} />}
      {mode === 'free' && <FreeFlow onExit={() => setMode(null)} navigate={navigate} />}
    </div>
  )
}

/* ----------------------------- Guided flow ----------------------------- */

function GuidedFlow({
  onExit,
  navigate,
}: {
  onExit: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const tracking = useGuidedVersatilitySession()

  // Auto-start the session on first mount: the user already chose "guided"
  // from the selector, so making them tap a second "Iniciar" feels redundant.
  // Inside an effect to avoid a setState-during-render warning.
  useEffect(() => {
    if (tracking.status === 'idle') tracking.start()
    // tracking.start identity is stable (useCallback in the hook); we
    // intentionally exclude `tracking` from deps to avoid re-firing on every
    // tracking-state update. Status check inside the effect is the gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (tracking.status === 'idle' || tracking.status === 'loading') {
    return <CenteredLoader text="Cargando preguntas…" />
  }

  if (tracking.status === 'finalizing') {
    return <CenteredLoader text="Calculando resultados…" />
  }

  if (tracking.status === 'error') {
    return (
      <ErrorScreen
        message={tracking.error ?? 'Ocurrió un error.'}
        onRetry={() => {
          tracking.reset()
          onExit()
        }}
      />
    )
  }

  if (tracking.status === 'results' && tracking.finalResult) {
    return (
      <SessionResultsView
        overallScore={tracking.finalResult.overall_score}
        averageRichness={averageRichness(tracking.finalResult.rounds.map((r) => r.vocabulary_richness))}
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
    )
  }

  if (!tracking.currentQuestion) {
    return <CenteredLoader text="Cargando preguntas…" />
  }

  return (
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
  )
}

/* ------------------------------ Free flow ------------------------------ */

function FreeFlow({
  onExit,
  navigate,
}: {
  onExit: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const tracking = useFreeVersatilitySession()

  if (tracking.status === 'error') {
    return (
      <ErrorScreen
        message={tracking.error ?? 'Ocurrió un error.'}
        onRetry={() => {
          tracking.reset()
          onExit()
        }}
      />
    )
  }

  if (tracking.status === 'results' && tracking.result) {
    const r = tracking.result
    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-4 py-8 overflow-y-auto h-full">
        <FeedbackPanel
          versatilityScore={r.versatility_score}
          vocabularyRichness={r.vocabulary_richness}
          feedback={r.feedback}
          audioIntelligible={r.audio_intelligible}
        />
        <SessionResultsView
          overallScore={r.versatility_score}
          averageRichness={r.vocabulary_richness}
          rounds={[]}
          onRestart={() => tracking.reset()}
          onExit={() => {
            tracking.reset()
            navigate('/dashboard')
          }}
        />
      </div>
    )
  }

  return (
    <FreeSessionView
      status={tracking.status}
      onStartRecording={tracking.startRecording}
      onStopAndUpload={tracking.stopAndUpload}
    />
  )
}

/* ----------------------------- Sub-screens ----------------------------- */

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
function averageRichness(values: Array<RichnessLevel | null>): RichnessLevel | null {
  const filtered = values.filter((v): v is RichnessLevel => v != null)
  if (filtered.length === 0) return null
  const counts: Record<number, number> = {}
  for (const v of filtered) counts[v] = (counts[v] ?? 0) + 1
  let bestLevel: RichnessLevel = filtered[0]
  let bestCount = 0
  for (const [level, count] of Object.entries(counts)) {
    const lvl = Number(level) as RichnessLevel
    // Tie-break on the higher tier so the result feels generous when feedback is mixed.
    if (count > bestCount || (count === bestCount && lvl > bestLevel)) {
      bestCount = count
      bestLevel = lvl
    }
  }
  return bestLevel
}
