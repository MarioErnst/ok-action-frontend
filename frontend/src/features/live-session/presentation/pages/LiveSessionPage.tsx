import { useNavigate } from 'react-router-dom'

import { ModuleGuideLauncher } from '../../../journey'
import { DimensionSelector } from '../components/organisms/DimensionSelector'
import { CalibrationScreen } from '../components/organisms/CalibrationScreen'
import { LiveRecordingScreen } from '../components/organisms/LiveRecordingScreen'
import { SessionSummaryScreen } from '../components/organisms/SessionSummaryScreen'
import { StoppedTransitionOverlay } from '../components/organisms/StoppedTransitionOverlay'
import { StrikeFeedbackBody } from '../components/organisms/StrikeFeedbackBody'
import { useLiveSession } from '../hooks/useLiveSession'

// Page-level orchestrator. The page itself has no state; it picks which
// organism to render based on the live session phase managed by
// useLiveSession. Errors render an inline retry surface so the user is
// not stuck without context.
export default function LiveSessionPage() {
  const navigate = useNavigate()
  const live = useLiveSession()

  if (live.phase === 'selection') {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center justify-center px-4 py-8">
        <div className="absolute right-4 top-4">
          <ModuleGuideLauncher guideId="live-session" />
        </div>
        <div data-journey-id="live-selection">
          <DimensionSelector
            selected={live.selectedModules}
            onToggle={live.toggleModule}
            onStart={() => {
              void live.start()
            }}
            isStartDisabled={live.selectedModules.length === 0}
            isStarting={live.isStarting}
            loudnessPresets={live.loudnessPresets}
            selectedLoudnessPresetId={live.selectedLoudnessPresetId}
            onSelectLoudnessPreset={live.selectLoudnessPreset}
          />
        </div>
        {live.error && <ErrorBanner message={live.error} />}
      </main>
    )
  }

  if (live.phase === 'calibrating') {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center justify-center px-4">
        <CalibrationScreen
          progress={live.calibrationProgress}
          audioEnabled={live.audioEnabled}
          facialEnabled={live.facialEnabled}
          step={live.calibrationStep}
        />
      </main>
    )
  }

  if (live.phase === 'recording' || live.phase === 'evaluating') {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center px-4">
        <LiveRecordingScreen
          phase={live.phase}
          selectedModules={live.selectedModules}
          elapsedSeconds={live.elapsedSeconds}
          activeStream={live.activeStream}
          videoStream={live.videoStream}
          isRecording={live.isRecording}
          audioEnabled={live.audioEnabled}
          facialEnabled={live.facialEnabled}
          phonationEnabled={live.phonationEnabled}
          loudnessEnabled={live.loudnessEnabled}
          phonationCurrentHz={live.phonationCurrentHz}
          phonationBreaksInWindow={live.phonationBreaksInWindow}
          loudnessCurrentBand={live.loudnessCurrentBand}
          loudnessOutOfRangeStreakMs={live.loudnessOutOfRangeStreakMs}
          onEnd={() => {
            void live.stop()
          }}
        />
      </main>
    )
  }

  if (live.phase === 'stopped_transition') {
    return (
      <main className="min-h-[100dvh] w-full bg-bg">
        <StoppedTransitionOverlay
          category={live.stopCategory}
          emotionLabel={live.emotionTriggerLabel ?? undefined}
          loudnessReason={live.loudnessStopReason}
          phonationReason={live.phonationStopReason}
        />
      </main>
    )
  }

  if (
    live.phase === 'stopped_feedback' &&
    (live.stopReason === 'auto_stop_strikes' ||
      live.stopReason === 'auto_stop_emotion' ||
      live.stopReason === 'auto_stop_loudness' ||
      live.stopReason === 'auto_stop_phonation')
  ) {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center px-4 py-8 pb-safe">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          <div className="flex justify-end" data-journey-id="live-results">
            <ModuleGuideLauncher guideId="live-session" />
          </div>
          <StrikeFeedbackBody
            events={live.strikeEvents}
            evaluation={live.evaluation}
            liveScore={live.liveScore}
            selectedModules={live.selectedModules}
            audioUrl={live.audioEnabled ? live.recordingAudioUrl : null}
            estimatedDurationMs={live.recordingDurationMs}
            stopReason={live.stopReason}
            emotionLabel={live.emotionTriggerLabel ?? undefined}
            loudnessReason={live.loudnessStopReason}
            phonationReason={live.phonationStopReason}
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              type="button"
              onClick={live.reset}
              className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold
                         text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95
                         transition-all duration-300 min-h-[44px]"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4
                         hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
            >
              Ir al dashboard
            </button>
            <button
              type="button"
              onClick={live.reset}
              className="flex-1 rounded-2xl border border-border/40 bg-transparent text-text-muted font-medium py-4
                         hover:text-text active:scale-95 transition-all duration-200 min-h-[44px]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (live.phase === 'summary' && live.evaluation) {
    return (
      <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center px-4">
        <div className="w-full" data-journey-id="live-results">
          <div className="mx-auto flex w-full max-w-2xl justify-end px-4 pt-4">
            <ModuleGuideLauncher guideId="live-session" />
          </div>
          <SessionSummaryScreen
            evaluation={live.evaluation}
            selectedModules={live.selectedModules}
            liveScore={live.liveScore}
            onNewSession={live.reset}
            onGoToDashboard={() => navigate('/dashboard')}
          />
        </div>
      </main>
    )
  }

  // Either phase is 'error', or 'summary' arrived without an evaluation
  // (which we treat as the same end state — no data to display).
  return (
    <main className="min-h-[100dvh] w-full bg-bg flex flex-col items-center justify-center px-6 text-center gap-6">
      <h1 className="text-2xl font-extrabold text-text">Algo salió mal</h1>
      <p className="text-sm text-text-muted max-w-md">
        {live.error ?? 'No se pudo completar la sesión.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={live.reset}
          className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold
                     text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95
                     transition-all duration-300 min-h-[44px]"
        >
          Volver a intentar
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4
                     hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
        >
          Volver al inicio
        </button>
      </div>
    </main>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-6 max-w-md w-full rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-center">
      <p className="text-sm text-danger">{message}</p>
    </div>
  )
}
