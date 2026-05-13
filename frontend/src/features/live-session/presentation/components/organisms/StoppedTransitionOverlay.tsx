interface StoppedTransitionOverlayProps {
  // Why the live session stopped. Drives the secondary message under
  // the headline. The full breakdown lives in the feedback page below,
  // this overlay only gives the user 2 seconds of psychological space
  // before the rich content appears.
  reason: 'strikes' | 'emotion'
  // Optional human-readable emotion name (e.g. "enojo") for the
  // 'emotion' reason. Ignored otherwise.
  emotionLabel?: string
}

// Brief two-second backdrop that fades in over the recording screen
// when the auto-stop fires. It cushions the cut between active
// recording and the dense feedback page so the user does not feel
// thrown out of the experience.
export const StoppedTransitionOverlay = ({ reason, emotionLabel }: StoppedTransitionOverlayProps) => {
  const subtitle =
    reason === 'strikes'
      ? 'Detectamos tres errores y pausamos la sesión.'
      : `Mantuviste una expresión de ${emotionLabel ?? 'malestar'} por demasiado tiempo.`

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/85 backdrop-blur-md animate-fade-in px-6 text-center">
      <div className="flex items-center justify-center mb-6">
        <div className="h-16 w-16 rounded-full border-2 border-warning/40 bg-warning/10 flex items-center justify-center animate-scale-in">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-8 w-8 text-warning"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12a2 2 0 00-3.48 0L3.2 16a2 2 0 001.73 3z" />
          </svg>
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-text">
        Tu sesión fue detenida
      </h1>
      <p className="text-sm sm:text-base text-text-muted mt-3 max-w-md">{subtitle}</p>
    </div>
  )
}
