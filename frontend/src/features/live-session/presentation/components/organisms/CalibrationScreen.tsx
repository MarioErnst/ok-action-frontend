import { CalibrationRing } from '../atoms/CalibrationRing'

interface CalibrationScreenProps {
  // 0..1 progress through the calibration window.
  progress: number
}

// Full-screen view shown for the ~2 seconds it takes to measure the
// noise floor at the start of every live session. The user is asked
// to stay silent so the detector can lock in an honest ambient
// reference. The CalibrationRing fills as time passes; the page
// orchestrator transitions to recording when the calibration promise
// resolves.
export const CalibrationScreen = ({ progress }: CalibrationScreenProps) => {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[60dvh] text-center px-6 animate-fade-in">
      <CalibrationRing progress={progress} size={140} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
          Calibrando audio
        </h1>
        <p className="text-sm sm:text-base text-text-muted max-w-sm">
          Mantente en silencio. Estamos midiendo el ruido del ambiente para evaluarte mejor.
        </p>
        <p className="text-xs text-accent font-medium uppercase tracking-widest mt-2">
          {pct}%
        </p>
      </div>
    </div>
  )
}
