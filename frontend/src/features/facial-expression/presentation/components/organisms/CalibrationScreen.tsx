import type { RefObject } from 'react'
import { CameraView } from '../molecules/CameraView'

type CalibrationScreenProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  isCameraActive: boolean
  // Fraction of calibration complete: 0.0 to 1.0 (frames collected / 75)
  calibrationProgress: number
  phase: 'loading' | 'calibration'
  onStart: () => void
}

export function CalibrationScreen({
  videoRef,
  isCameraActive,
  calibrationProgress,
  phase,
  onStart,
}: CalibrationScreenProps) {
  const isLoading = phase === 'loading'
  // Hide the button once calibration has started (progress > 0)
  const showButton = calibrationProgress === 0

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xs mx-auto py-8 px-4">
      {/* Camera preview — square crop to keep portrait layout compact */}
      <div className="w-full aspect-square overflow-hidden rounded-xl">
        <CameraView videoRef={videoRef} isActive={isCameraActive} />
      </div>

      <div className="w-full flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            {/* Spinner shown while the face detection model is loading */}
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-sm text-text-muted text-center">
              Cargando detector facial...
            </p>
          </div>
        ) : (
          <p className="text-sm text-text text-center leading-relaxed">
            Mantén una expresión neutral mientras se realiza la calibración
          </p>
        )}

        {/* Progress bar — fills as calibration frames accumulate */}
        <div className="w-full h-1.5 bg-surface-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${calibrationProgress * 100}%` }}
          />
        </div>

        {showButton && (
          <button
            type="button"
            onClick={onStart}
            disabled={isLoading}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              isLoading
                ? 'bg-surface text-text-muted cursor-not-allowed'
                : 'bg-accent text-white active:bg-accent/80'
            }`}
          >
            Iniciar calibración
          </button>
        )}
      </div>
    </div>
  )
}
