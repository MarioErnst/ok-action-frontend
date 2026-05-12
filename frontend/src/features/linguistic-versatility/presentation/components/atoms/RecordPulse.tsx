/**
 * Tiny pulsing red dot used in headers and inline labels to signal that the
 * microphone is currently capturing. Same pattern as live-detection in the
 * facial-expression module so the visual cue is consistent across features.
 */
export function RecordPulse() {
  return (
    <span className="relative inline-flex h-2 w-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  )
}
