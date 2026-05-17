import { useEffect, useRef, useState } from 'react'
import type { StrikeEvent } from '../../../domain/StrikeEvent'
import { StrikeMarker } from '../molecules/StrikeMarker'

interface FrameAudioPlayerProps {
  audioUrl: string
  // Approximate recording duration in milliseconds. Used to place the
  // markers; falls back to the audio element's actual duration once it
  // loads.
  estimatedDurationMs: number
  events: StrikeEvent[]
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Compact audio player with timeline markers anchored to each strike
// event. Tapping a marker seeks the audio to the moment of that
// strike. The total duration shown defaults to the estimate provided
// by the parent and is refined to the audio element's reported value
// as soon as metadata loads.
export const FrameAudioPlayer = ({
  audioUrl,
  estimatedDurationMs,
  events,
}: FrameAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(estimatedDurationMs)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentMs(audio.currentTime * 1000)
    const onLoaded = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDurationMs(audio.duration * 1000)
      }
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  const seekToMs = (ms: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, ms) / 1000
    if (audio.paused) void audio.play()
  }

  const progressPct = durationMs > 0 ? (currentMs / durationMs) * 100 : 0

  return (
    <div className="w-full flex flex-col gap-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-accent text-text-on-accent flex items-center justify-center font-bold cursor-pointer active:scale-95 transition-transform"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="text-xs text-text-muted tabular-nums">
          {formatTime(currentMs / 1000)} / {formatTime(durationMs / 1000)}
        </div>
      </div>

      <div className="relative h-2 w-full bg-surface-alt rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
        {events.map((event, i) => {
          const positionPct =
            durationMs > 0 ? (event.timestampMs / durationMs) * 100 : 0
          return (
            <StrikeMarker
              key={`${event.kind}-${event.timestampMs}-${i}`}
              positionPct={positionPct}
              label={event.detail}
              onClick={() => seekToMs(event.timestampMs)}
            />
          )
        })}
      </div>
    </div>
  )
}
