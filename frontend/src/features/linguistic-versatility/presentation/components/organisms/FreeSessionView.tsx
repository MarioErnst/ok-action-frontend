import { useEffect, useState } from 'react'
import type { FreeStatus } from '../../../domain/LinguisticVersatility'
import { RecordButton } from '../molecules/RecordButton'
import { RecordPulse } from '../atoms/RecordPulse'

type Props = {
  status: FreeStatus
  onStartRecording: () => void
  onStopAndUpload: () => void
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Free-mode body. Single primary action plus a live chronometer while
 * recording. The placeholder/tip text changes per-status so the user always
 * knows what's expected of them.
 */
export function FreeSessionView({ status, onStartRecording, onStopAndUpload }: Props) {
  const [elapsed, setElapsed] = useState(0)

  // Tick once a second while recording. Reset to 0 on every status change.
  useEffect(() => {
    if (status !== 'recording') {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - start), 250)
    return () => clearInterval(id)
  }, [status])

  const recordState =
    status === 'recording' ? 'recording' : status === 'uploading' ? 'uploading' : 'idle'

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-4 pt-4 pb-safe gap-6">
      <div className="rounded-3xl bg-surface/85 backdrop-blur-md border border-border/60 p-6 flex flex-col items-center gap-4 shadow-lg">
        {status === 'idle' && (
          <p className="text-sm text-text leading-relaxed text-center">
            Hablá libremente sobre cualquier tema durante el tiempo que quieras. Cuando termines, presioná detener para recibir tu evaluación.
          </p>
        )}
        {status === 'recording' && (
          <>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-text-muted">
              <RecordPulse />
              Grabando
            </div>
            <span className="text-5xl font-extrabold tabular-nums text-text">
              {formatMs(elapsed)}
            </span>
            <p className="text-xs text-text-muted text-center">
              Hablá con naturalidad. Cuando quieras, detené para enviar el audio.
            </p>
          </>
        )}
        {status === 'uploading' && (
          <p className="text-sm text-text-muted">Procesando tu audio…</p>
        )}
      </div>

      <div className="mt-auto">
        <RecordButton
          state={recordState}
          onStart={onStartRecording}
          onStop={onStopAndUpload}
        />
      </div>
    </div>
  )
}
