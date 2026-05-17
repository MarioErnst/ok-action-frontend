interface StrikeMarkerProps {
  // Horizontal position along the audio timeline expressed as a
  // percentage (0..100) of the total recording duration.
  positionPct: number
  onClick?: () => void
  label?: string
}

// A single dot anchored over the audio timeline at the moment a strike
// fired. Tapping a marker seeks the audio player to that timestamp.
// The dot is clickable on all platforms via a button element so it
// passes the 44x44 touch target rule when scaled with the parent.
//
// All live strikes today are muletillas; the warning color was already
// the muletilla swatch in the previous per-kind palette so the visual
// language is unchanged for the user.
export const StrikeMarker = ({ positionPct, onClick, label }: StrikeMarkerProps) => {
  const clamped = Math.max(0, Math.min(100, positionPct))
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? 'Marcador de error'}
      title={label}
      // Position is set inline because Tailwind cannot generate dynamic
      // left percentages at build time.
      style={{ left: `${clamped}%` }}
      // The visible dot is 12 px, but the tap area is enlarged with
      // negative margin so it still respects the 44 px touch target on
      // mobile without disturbing the visual size.
      className="absolute -top-2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-bg bg-warning
                  cursor-pointer transition-transform duration-150
                  hover:scale-125 focus-visible:outline-none focus-visible:scale-125
                  before:absolute before:-inset-[14px] before:content-['']"
    />
  )
}
