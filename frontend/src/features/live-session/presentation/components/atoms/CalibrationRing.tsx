interface CalibrationRingProps {
  // 0..1 progress through the calibration window.
  progress: number
  // Optional pixel diameter override. Default 120.
  size?: number
}

// Circular SVG indicator that fills as the noise floor calibration
// elapses. Used during the brief "Mantente en silencio" phase before
// recording starts.
export const CalibrationRing = ({ progress, size = 120 }: CalibrationRingProps) => {
  const clamped = Math.max(0, Math.min(1, progress))
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped)
  const half = size / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="text-accent"
    >
      <circle
        cx={half}
        cy={half}
        r={radius}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={stroke}
        fill="transparent"
      />
      <circle
        cx={half}
        cy={half}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${half} ${half})`}
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
  )
}
