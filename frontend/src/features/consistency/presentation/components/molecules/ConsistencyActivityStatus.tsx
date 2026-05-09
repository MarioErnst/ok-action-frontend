import type { ConsistencyPhase } from '../../../domain/ConsistencySession'

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

interface Props {
  phase: Extract<ConsistencyPhase, 'connecting' | 'recording' | 'analyzing'>
  elapsedSeconds: number
  onEndSession: () => void
}

export function ConsistencyActivityStatus({ phase, elapsedSeconds, onEndSession }: Props) {
  const isRecording = phase === 'recording'

  return (
    <section className="flex flex-col items-center gap-4">
      {isRecording ? (
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full bg-danger/20 opacity-75 animate-ping" />
          <div className="h-10 w-10 rounded-full bg-danger shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
        </div>
      ) : (
        <div className="h-16 w-16 rounded-full border-4 border-border border-t-accent animate-spin" />
      )}
      <p className="text-sm font-semibold text-text-muted">
        {phase === 'connecting' && 'Conectando...'}
        {phase === 'recording' && `Escuchando ${formatTime(elapsedSeconds)}`}
        {phase === 'analyzing' && 'Analizando intento...'}
      </p>
      {isRecording && (
        <button
          type="button"
          onClick={onEndSession}
          className="w-full rounded-xl border border-border/60 bg-surface-alt/50 px-4 py-3 text-sm font-bold text-text-muted transition-colors hover:border-danger/50 hover:text-danger"
        >
          Terminar intento
        </button>
      )}
    </section>
  )
}
