import { CalibrationRing } from '../atoms/CalibrationRing'

interface CalibrationScreenProps {
  // 0..1 progress through the calibration window.
  progress: number
  // Whether audio is being calibrated (noise floor + recorder). False
  // when the user only selected facial_expression, in which case the
  // calibration window is held purely to feed enough blendshape samples
  // to the facial baseline.
  audioEnabled: boolean
  // Whether the facial baseline is being collected. When true the user
  // needs to face the camera with a neutral expression so the emotion
  // classifier locks a per-user reference (mirrors the dedicated
  // calibration step in the standalone facial_expression module).
  facialEnabled: boolean
}

// Full-screen view shown during the calibration window at the start of
// every live session. The instructions adapt to which signals we are
// actually measuring: silence-only when no facial, neutral-face-only
// when no audio, both when the user selected facial_expression alongside
// audio modules. Keeping the wording specific is what makes the
// emotion auto-stop reliable — if the user pulls a face during
// calibration the baseline absorbs that expression and the sustained
// detector never fires.
export const CalibrationScreen = ({
  progress,
  audioEnabled,
  facialEnabled,
}: CalibrationScreenProps) => {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  const { title, description } = pickCopy(audioEnabled, facialEnabled)
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[60dvh] text-center px-6 animate-fade-in">
      <CalibrationRing progress={progress} size={140} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">{title}</h1>
        <p className="text-sm sm:text-base text-text-muted max-w-sm">{description}</p>
        <p className="text-xs text-accent font-medium uppercase tracking-widest mt-2">
          {pct}%
        </p>
      </div>
    </div>
  )
}

function pickCopy(audioEnabled: boolean, facialEnabled: boolean): {
  title: string
  description: string
} {
  if (audioEnabled && facialEnabled) {
    return {
      title: 'Calibrando audio y cámara',
      description:
        'Mantente en silencio y mirá la cámara con cara neutral. Estamos midiendo el ruido del ambiente y la expresión base de tu rostro para evaluarte mejor.',
    }
  }
  if (facialEnabled) {
    return {
      title: 'Calibrando cámara',
      description:
        'Mirá la cámara con cara neutral. Estamos midiendo la expresión base de tu rostro para detectar emociones a partir de ahí.',
    }
  }
  return {
    title: 'Calibrando audio',
    description:
      'Mantente en silencio. Estamos midiendo el ruido del ambiente para evaluarte mejor.',
  }
}
