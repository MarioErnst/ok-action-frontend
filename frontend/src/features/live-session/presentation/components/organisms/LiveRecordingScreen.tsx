import { useEffect, useRef } from 'react'
import { RecordingWaveform } from '../../../../../shared/ui/molecules/RecordingWaveform'
import type { LoudnessBand } from '../../../../loudness/domain/LoudnessSession'
import { LIVE_MODULE_LABELS } from '../../../domain/liveDimLabels'
import type { LiveModule, LiveSessionPhase } from '../../../domain/LiveSession'
import { LiveLoudnessMeter } from './LiveLoudnessMeter'
import { LivePhonationMeter } from './LivePhonationMeter'

// Thresholds visible in the meter widgets; sourced from the hooks but
// re-declared here so the bar progress fills are accurate without the
// hooks needing to surface their internals. Keep aligned with the
// constants in useLivePhonation and useLiveLoudness.
const PHONATION_BREAK_THRESHOLD = 5
const LOUDNESS_CLIPPING_THRESHOLD_MS = 3_000

// Maximum session duration in seconds; the progress bar fills to 100% at
// this point and the parent hook auto-stops. Five minutes mirrors the
// previous live UI cap.
const MAX_SESSION_SECONDS = 300

interface Props {
  phase: Extract<LiveSessionPhase, 'recording' | 'evaluating'>
  selectedModules: LiveModule[]
  elapsedSeconds: number
  activeStream: MediaStream | null
  videoStream: MediaStream | null
  isRecording: boolean
  // Whether at least one audio module is selected. Drives copy + the
  // waveform area. We pass it explicitly instead of inferring from
  // activeStream because activeStream can be null transiently even when
  // audio modules are selected.
  audioEnabled: boolean
  // Whether facial_expression is selected. Drives the recording
  // subtitle in flows without audio.
  facialEnabled: boolean
  // Live state of the phonation / loudness hooks. Only used when their
  // respective modules are selected; the screen falls back to a flat
  // copy when they are not.
  phonationEnabled: boolean
  loudnessEnabled: boolean
  phonationCurrentHz: number | null
  phonationBreaksInWindow: number
  loudnessCurrentBand: LoudnessBand
  loudnessClippingStreakMs: number
  onEnd: () => void
}

// Free-speech recording screen. No real-time feedback panel because the
// new backend produces a single Gemini call at close, not streaming
// analysis. The visible state is intentionally minimal: a countdown,
// the list of modules being measured, and the end-session button.
// When facial_expression is active, the camera preview lives at the
// top so the user can see themselves while the classifier feeds the
// emotion monitor in the background. The waveform area is hidden when
// no audio module is selected so the layout does not leave a flat
// silent strip in the middle of the screen.
export function LiveRecordingScreen({
  phase,
  selectedModules,
  elapsedSeconds,
  activeStream,
  videoStream,
  isRecording,
  audioEnabled,
  facialEnabled,
  phonationEnabled,
  loudnessEnabled,
  phonationCurrentHz,
  phonationBreaksInWindow,
  loudnessCurrentBand,
  loudnessClippingStreakMs,
  onEnd,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoStream) return
    if (video.srcObject !== videoStream) {
      video.srcObject = videoStream
      void video.play().catch(() => {
        // play() can reject on hidden tabs or blocked autoplay; the
        // stream stays bound and will resume once the element becomes
        // visible.
      })
    }
  }, [videoStream])

  const progressPercent = Math.min(
    (elapsedSeconds / MAX_SESSION_SECONDS) * 100,
    100,
  )
  const remainingSeconds = Math.max(0, MAX_SESSION_SECONDS - elapsedSeconds)
  const mins = Math.floor(remainingSeconds / 60)
  const secs = String(remainingSeconds % 60).padStart(2, '0')
  const isEvaluating = phase === 'evaluating'

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-md mx-auto min-h-[100dvh] pt-8 pb-28 lg:pb-6 animate-fade-in">
      <div className="w-full">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span className="font-bold uppercase tracking-widest text-accent">
            Sesión libre
          </span>
          <span className="font-mono">
            {mins}:{secs} restantes
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {videoStream && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-surface border border-border/30 relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-3 py-4 w-full">
        {isEvaluating ? (
          <div className="w-16 h-16 rounded-full border-4 border-border border-t-accent animate-spin" />
        ) : audioEnabled ? (
          <div className="w-full">
            <RecordingWaveform stream={activeStream} active={isRecording} height={56} />
          </div>
        ) : null}
        <p className="text-sm font-medium text-text-muted">
          {pickStatusLabel({ isEvaluating, audioEnabled, facialEnabled })}
        </p>
      </div>

      {(phonationEnabled || loudnessEnabled) && !isEvaluating && (
        <div
          className={`w-full grid gap-3 ${
            phonationEnabled && loudnessEnabled
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {phonationEnabled && (
            <LivePhonationMeter
              currentHz={phonationCurrentHz}
              breaksInWindow={phonationBreaksInWindow}
              breakThreshold={PHONATION_BREAK_THRESHOLD}
            />
          )}
          {loudnessEnabled && (
            <LiveLoudnessMeter
              currentBand={loudnessCurrentBand}
              clippingStreakMs={loudnessClippingStreakMs}
              clippingThresholdMs={LOUDNESS_CLIPPING_THRESHOLD_MS}
            />
          )}
        </div>
      )}

      <div className="w-full rounded-2xl border border-border/40 bg-surface/40 backdrop-blur-sm p-5 flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Estamos midiendo
        </p>
        <ul className="flex flex-wrap gap-2">
          {selectedModules.map((module) => (
            <li
              key={module}
              className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-xs font-semibold text-accent"
            >
              {LIVE_MODULE_LABELS[module]}
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted leading-relaxed">
          La retroalimentación detallada aparecerá cuando termines la sesión.
        </p>
      </div>

      <button
        onClick={onEnd}
        disabled={isEvaluating}
        type="button"
        className="w-full py-4 rounded-2xl border border-border/60 bg-surface-alt/50 text-text-muted
                   font-medium hover:border-danger/50 hover:text-danger active:scale-95 transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
      >
        {isEvaluating ? 'Procesando…' : 'Terminar sesión'}
      </button>
    </div>
  )
}

function pickStatusLabel({
  isEvaluating,
  audioEnabled,
  facialEnabled,
}: {
  isEvaluating: boolean
  audioEnabled: boolean
  facialEnabled: boolean
}): string {
  if (isEvaluating) {
    if (audioEnabled && facialEnabled) return 'Evaluando audio y expresión...'
    if (audioEnabled) return 'Evaluando audio...'
    return 'Procesando expresión...'
  }
  if (audioEnabled && facialEnabled) return 'Escuchando y observando...'
  if (audioEnabled) return 'Escuchando...'
  return 'Observando tu expresión...'
}
