import { useNavigate } from 'react-router-dom'

import { ModuleGuideLauncher } from '../../../journey'
import { DimensionSelector } from '../components/organisms/DimensionSelector'
import { CalibrationScreen } from '../components/organisms/CalibrationScreen'
import { LiveRecordingScreen } from '../components/organisms/LiveRecordingScreen'
import { SessionSummaryScreen } from '../components/organisms/SessionSummaryScreen'
import { StoppedTransitionOverlay } from '../components/organisms/StoppedTransitionOverlay'
import { StrikeFeedbackBody } from '../components/organisms/StrikeFeedbackBody'
import { useLiveSession } from '../hooks/useLiveSession'

export default function LiveSessionPage() {
  const navigate = useNavigate()
  const live = useLiveSession()

  const renderContent = () => {
    if (live.phase === 'selection') {
      return (
        <div className="flex flex-col w-full max-w-3xl">
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
        </div>
      )
    }

    if (live.phase === 'calibrating') {
      return (
        <div className="flex flex-col w-full max-w-3xl">
          <CalibrationScreen
            progress={live.calibrationProgress}
            audioEnabled={live.audioEnabled}
            facialEnabled={live.facialEnabled}
            step={live.calibrationStep}
          />
        </div>
      )
    }

    if (live.phase === 'recording' || live.phase === 'evaluating') {
      return (
        <div className="flex flex-col w-full max-w-3xl">
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
            loudnessHighStreakMs={live.loudnessHighStreakMs}
            onEnd={() => {
              void live.stop()
            }}
          />
        </div>
      )
    }

    if (live.phase === 'stopped_transition') {
      return (
        <div className="flex flex-col w-full max-w-3xl">
          <StoppedTransitionOverlay
            category={live.stopCategory}
            emotionLabel={live.emotionTriggerLabel ?? undefined}
            loudnessReason={live.loudnessStopReason}
            phonationReason={live.phonationStopReason}
          />
        </div>
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
        <div className="flex flex-col w-full max-w-3xl gap-6">
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
              className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all duration-300 min-h-[44px]"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4 hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
            >
              Ir al dashboard
            </button>
            <button
              type="button"
              onClick={live.reset}
              className="flex-1 rounded-2xl border border-border/40 bg-transparent text-text-muted font-medium py-4 hover:text-text active:scale-95 transition-all duration-200 min-h-[44px]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )
    }

    if (live.phase === 'summary' && live.evaluation) {
      return (
        <div className="flex flex-col w-full max-w-4xl" data-journey-id="live-results">
          <SessionSummaryScreen
            evaluation={live.evaluation}
            selectedModules={live.selectedModules}
            liveScore={live.liveScore}
            onNewSession={live.reset}
            onGoToDashboard={() => navigate('/dashboard')}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-start w-full max-w-3xl gap-6">
        <h1 className="text-2xl font-extrabold text-text">Algo salió mal</h1>
        <p className="text-sm text-text-muted max-w-md">
          {live.error ?? 'No se pudo completar la sesión.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={live.reset}
            className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-accent-hover py-4 font-extrabold text-text-on-accent shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all duration-300 min-h-[44px]"
          >
            Volver a intentar
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 rounded-2xl border border-border/60 bg-surface-alt/50 text-text font-medium py-4 hover:border-border active:scale-95 transition-all duration-200 min-h-[44px]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex-1 w-full flex flex-col animate-fade-in relative z-10 gap-6">
      <header className="relative mb-6 md:mb-10 text-left" data-journey-id="live-session-intro">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-28 w-28 rounded-full bg-accent/20 blur-[60px] animate-pulse-glow" />
        <div className="relative z-10 flex flex-row items-start justify-between gap-4 w-full">
          <div>
            <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Evaluación</p>
            <h1 className="text-text text-3xl md:text-4xl font-extrabold tracking-tight">Sesión Libre</h1>
            <p className="text-text-muted mt-2 text-sm md:text-base max-w-xl">Practica libre de comunicación.</p>
          </div>
          <div className="shrink-0 mt-1">
            <ModuleGuideLauncher guideId="live-session" />
          </div>
        </div>
      </header>
      
      {renderContent()}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 p-4 border border-danger/40 bg-danger/10 rounded-2xl">
      <p className="text-sm text-danger">{message}</p>
    </div>
  )
}
