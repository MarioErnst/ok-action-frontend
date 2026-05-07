type VoiceIndicatorProps = {
  isSpeaking: boolean
}

export function VoiceIndicator({ isSpeaking }: VoiceIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg">
      <div className="flex gap-1 items-end h-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isSpeaking ? 'bg-accent' : 'bg-border'
            }`}
            style={{
              height: isSpeaking ? `${50 + i * 25}%` : '25%',
              transitionDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">
        {isSpeaking ? 'Voz detectada' : 'Sin voz'}
      </span>
    </div>
  )
}
